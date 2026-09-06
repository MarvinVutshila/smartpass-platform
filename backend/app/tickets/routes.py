from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, get_current_staff_user
from app.users.models import User
from app.tickets.models import Ticket
from app.tickets.services import (
    _payload_from_ticket,
    _qr_data_url,
    _computed_status,
    _build_ticket_pdf,
    send_ticket_email,
    rebuild_credential,
    _verify_ticket,
    _log_audit,
)
from app.events.models import Event
from app.tickets.schemas import TicketOut
from crypto_ticket import verify_credential_signature, CredentialInvalid, credential_sha256

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

# ─── Check‑in request schema ─────────────────────────────────────────
class CheckinRequest(BaseModel):
    credential: str
    event_id: Optional[int] = None

# ─── Public endpoints ─────────────────────────────────────────────────
@router.get("/me", response_model=list[TicketOut])
def get_my_tickets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tickets = db.query(Ticket).filter(Ticket.user_id == current_user.id).order_by(Ticket.issued_at.desc()).all()
    out = []
    for t in tickets:
        event = db.query(Event).filter(Event.id == t.event_id).first()
        credential = t.credential if t.credential else rebuild_credential(_payload_from_ticket(t))
        out.append(TicketOut(
            id=t.id,
            public_ticket_id=t.public_ticket_id,
            order_ref=t.order_ref,
            event_id=t.event_id,
            event_name=event.name if event else "Unknown Event",
            venue=event.venue if event else "TBA",
            ticket_type=t.ticket_type,
            status=_computed_status(t),
            qr_image_url=_qr_data_url(credential),
            price_paid=t.price_paid,
            issued_at=t.issued_at,
            expires_at=t.expires_at,
            checked_in_at=t.checked_in_at,
        ))
    return out

@router.get("/{ticket_id}/pdf")
def download_ticket_pdf(ticket_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.user_id == current_user.id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    event = db.query(Event).filter(Event.id == ticket.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    credential = ticket.credential if ticket.credential else rebuild_credential(_payload_from_ticket(ticket))
    pdf_bytes = _build_ticket_pdf(ticket, current_user, event, credential)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="ticket-{ticket.public_ticket_id}.pdf"'},
    )

@router.post("/{ticket_id}/email")
def resend_ticket_email(ticket_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.user_id == current_user.id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    event = db.query(Event).filter(Event.id == ticket.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    credential = ticket.credential if ticket.credential else rebuild_credential(_payload_from_ticket(ticket))
    send_ticket_email(current_user.email, current_user, event, ticket, credential)
    return {"message": "Ticket resent to your email"}

# ─── Public verification ─────────────────────────────────────────────
@router.get("/verify")
def verify_ticket(
    credential: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to verify a ticket by its signed credential.
    Returns status: VALID, USED, EXPIRED, REVOKED, INVALID.
    """
    try:
        payload = verify_credential_signature(credential)
    except CredentialInvalid as e:
        return {"status": "INVALID", "message": f"Invalid signature: {str(e)}"}
    except Exception as e:
        return {"status": "INVALID", "message": f"Verification error: {str(e)}"}

    ticket = db.query(Ticket).filter(Ticket.public_ticket_id == payload.tid).first()
    if not ticket:
        return {"status": "INVALID", "message": "Ticket not found in database"}

    if credential_sha256(credential) != ticket.credential_hash:
        return {"status": "INVALID", "message": "Credential hash mismatch – ticket may be forged"}

    if ticket.event_id != payload.eid:
        return {"status": "INVALID", "message": "Event mismatch – ticket does not belong to this event"}

    status = _computed_status(ticket)
    status_map = {
        "active": "VALID",
        "checked_in": "USED",
        "revoked": "REVOKED",
        "expired": "EXPIRED",
    }
    result = status_map.get(status, "INVALID")

    event = db.query(Event).filter(Event.id == ticket.event_id).first()
    attendee = db.query(User).filter(User.id == ticket.user_id).first()

    return {
        "status": result,
        "message": f"Ticket is {result}",
        "ticket_id": ticket.public_ticket_id,
        "event_name": event.name if event else None,
        "attendee_name": attendee.full_name if attendee else None,
        "ticket_type": ticket.ticket_type,
        "checked_in_at": ticket.checked_in_at,
        "issued_at": ticket.issued_at,
        "expires_at": ticket.expires_at,
    }

# ─── Staff check‑in ──────────────────────────────────────────────────
@router.post("/checkin")
def staff_checkin(
    req: CheckinRequest,
    request: Request,
    staff: User = Depends(get_current_staff_user),
    db: Session = Depends(get_db)
):
    """
    Staff‑only endpoint to mark a ticket as used (check‑in).
    Updates `checked_in_at` and increments the "Scanned Today" counter.
    """
    meta = {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }

    # 1. Verify the credential signature and get the ticket
    ticket, payload, error = _verify_ticket(db, req.credential)
    if error or not ticket:
        _log_audit(db,
                   public_ticket_id=(payload.tid if payload else None),
                   event_id=req.event_id,
                   result="INVALID",
                   reason=f"Verification failed: {error}",
                   scanned_by=staff.id,
                   meta=meta)
        return {"result": "INVALID", "message": f"Invalid ticket: {error}"}

    # 2. Check if ticket belongs to the correct event (if event_id provided)
    if req.event_id is not None and ticket.event_id != req.event_id:
        _log_audit(db,
                   public_ticket_id=ticket.public_ticket_id,
                   event_id=req.event_id,
                   result="WRONG_EVENT",
                   reason=f"ticket belongs to event {ticket.event_id}",
                   scanned_by=staff.id,
                   meta=meta)
        return {"result": "WRONG_EVENT", "message": "This ticket does not belong to this event"}

    # 3. Check if ticket is revoked
    if ticket.revoked_at is not None:
        _log_audit(db,
                   public_ticket_id=ticket.public_ticket_id,
                   event_id=ticket.event_id,
                   result="REVOKED",
                   reason=ticket.revoked_reason,
                   scanned_by=staff.id,
                   meta=meta)
        return {"result": "REVOKED", "message": "Ticket revoked — Entry denied"}

    # 4. Check if already checked in
    if ticket.status == "checked_in":
        _log_audit(db,
                   public_ticket_id=ticket.public_ticket_id,
                   event_id=ticket.event_id,
                   result="ALREADY_USED",
                   reason=None,
                   scanned_by=staff.id,
                   meta=meta)
        return {
            "result": "ALREADY_USED",
            "message": "Ticket already checked in",
            "checked_in_at": ticket.checked_in_at
        }

    # 5. Mark as checked in
    now = datetime.utcnow()
    ticket.status = "checked_in"
    ticket.checked_in_at = now
    ticket.checked_in_by = staff.id
    db.commit()
    db.refresh(ticket)

    # 6. Log successful check‑in
    _log_audit(db,
               public_ticket_id=ticket.public_ticket_id,
               event_id=ticket.event_id,
               result="VALID",
               reason=None,
               scanned_by=staff.id,
               meta=meta)

    # 7. Fetch event and attendee names for response
    event = db.query(Event).filter(Event.id == ticket.event_id).first()
    attendee = db.query(User).filter(User.id == ticket.user_id).first()

    return {
        "result": "VALID",
        "message": "Ticket verified — Entry permitted",
        "ticket_type": ticket.ticket_type,
        "attendee_name": attendee.full_name if attendee else None,
        "event_name": event.name if event else None,
        "checked_in_at": ticket.checked_in_at,
    }