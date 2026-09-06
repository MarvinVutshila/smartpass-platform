from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_current_admin_user, get_current_staff_user
from app.users.models import User
from app.events.models import Event, TicketTier
from app.tickets.models import Ticket, AuditLog, Payment
from app.events.schemas import EventCreate, EventOut, TicketTierCreate, TicketTierOut
from app.events.services import create_event, update_event, delete_event, get_event
from app.users.schemas import UserOut, RoleUpdate
from app.tickets.services import _computed_status
from datetime import datetime
import os
import shutil
import secrets
from app.core.config import settings

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ---------- Users ----------
@router.get("/users", response_model=list[UserOut])
def list_users(admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    return db.query(User).all()

@router.put("/users/{user_id}/role")
def update_role(user_id: int, role_update: RoleUpdate, admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    if role_update.role not in ("user", "staff", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    user.role = role_update.role
    db.commit()
    return {"message": f"User {user.email} role updated"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.delete(user)
    db.commit()
    return {"message": f"User {user.email} deleted"}

# ---------- Events (admin) ----------
@router.post("/events", response_model=EventOut)
def create_event_admin(event: EventCreate, admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    return create_event(db, event, admin.id)

@router.put("/events/{event_id}", response_model=EventOut)
def update_event_admin(event_id: int, event: EventCreate, admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    updated = update_event(db, event_id, event)
    if not updated:
        raise HTTPException(status_code=404, detail="Event not found")
    return updated

@router.delete("/events/{event_id}")
def delete_event_admin(event_id: int, admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    if not delete_event(db, event_id):
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}

# ---------- Tiers ----------
@router.get("/events/{event_id}/tiers", response_model=list[TicketTierOut])
def list_tiers(event_id: int, admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    event = get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event.tiers

@router.post("/events/{event_id}/tiers", response_model=TicketTierOut)
def create_tier(event_id: int, tier: TicketTierCreate, admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    event = get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    new_tier = TicketTier(
        event_id=event_id,
        name=tier.name,
        description=tier.description,
        price=tier.price,
        capacity=tier.capacity,
        benefits=tier.benefits,
    )
    db.add(new_tier)
    db.commit()
    db.refresh(new_tier)
    return new_tier

@router.put("/tiers/{tier_id}", response_model=TicketTierOut)
def update_tier(tier_id: int, tier: TicketTierCreate, admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    existing = db.query(TicketTier).filter(TicketTier.id == tier_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Tier not found")
    existing.name = tier.name
    existing.description = tier.description
    existing.price = tier.price
    existing.capacity = tier.capacity
    existing.benefits = tier.benefits
    db.commit()
    db.refresh(existing)
    return existing

@router.delete("/tiers/{tier_id}")
def delete_tier(tier_id: int, admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    existing = db.query(TicketTier).filter(TicketTier.id == tier_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Tier not found")
    db.delete(existing)
    db.commit()
    return {"message": "Tier deleted"}

# ---------- Revoke / Block ----------
@router.post("/tickets/{ticket_id}/revoke")
def revoke_ticket(ticket_id: int, body: dict, admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.revoked_at is not None:
        raise HTTPException(status_code=400, detail="Ticket already revoked")
    ticket.revoked_at = datetime.utcnow()
    ticket.revoked_reason = body.get("reason", "No reason provided")
    ticket.revoked_by = admin.id
    # Also update status? The _computed_status will treat revoked_at as revoked.
    db.commit()
    audit = AuditLog(
        public_ticket_id=ticket.public_ticket_id,
        event_id=ticket.event_id,
        result="REVOKED",
        reason=ticket.revoked_reason,
        scanned_by=admin.id,
    )
    db.add(audit)
    db.commit()
    return {"message": f"Ticket {ticket.public_ticket_id} revoked"}

# NEW: Block ticket (alias for revoke, for frontend compatibility)
@router.post("/tickets/{ticket_id}/block")
def block_ticket(ticket_id: int, admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Block a ticket – same as revoke."""
    return revoke_ticket(ticket_id, {"reason": "Blocked by admin"}, admin, db)

# ---------- Analytics ----------
@router.get("/analytics")
def analytics(admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_events = db.query(Event).count()
    total_tickets = db.query(Ticket).count()
    total_revenue = db.query(func.sum(Ticket.price_paid)).scalar() or 0.0
    events_with_sales = db.query(
        Event.id, Event.name, func.count(Ticket.id).label("tickets_sold")
    ).outerjoin(Ticket, Ticket.event_id == Event.id).group_by(Event.id).all()
    return {
        "users": total_users,
        "events": total_events,
        "tickets": total_tickets,
        "revenue": float(total_revenue),
        "events": [{"id": e.id, "name": e.name, "tickets_sold": e.tickets_sold} for e in events_with_sales],
    }

@router.get("/audit")
def get_audit(admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db), limit: int = 100):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(min(limit, 500)).all()

@router.get("/tickets/recent")
def recent_tickets(admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    recent = db.query(Ticket).order_by(Ticket.issued_at.desc()).limit(20).all()
    result = []
    for t in recent:
        event = db.query(Event).filter(Event.id == t.event_id).first()
        user = db.query(User).filter(User.id == t.user_id).first()
        result.append({
            "id": t.id,
            "public_ticket_id": t.public_ticket_id,
            "event_name": event.name if event else "Unknown",
            "user_email": user.email if user else "Unknown",
            "price_paid": t.price_paid,
            "purchase_date": t.issued_at,
            "status": _computed_status(t),
        })
    return result

# ---------- Fraud ----------
@router.get("/fraud")
def fraud_data(admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    tickets = db.query(Ticket).order_by(Ticket.id.desc()).limit(50).all()
    result = []
    for t in tickets:
        status = _computed_status(t)
        risk = 0.0
        risk_reasons = []

        if status == "revoked":
            risk = 0.9
            risk_reasons.append("Revoked")
        elif status == "expired":
            risk = 0.6
            risk_reasons.append("Expired")
        elif status == "checked_in":
            risk = 0.2
            risk_reasons.append("Already used")
        else:  # active
            risk = 0.0
            risk_reasons.append("Active")
            if t.issued_at and (datetime.utcnow() - t.issued_at).total_seconds() > 86400:
                risk = 0.3
                risk_reasons.append("Unused for >24h")

        result.append({
            "ticket_id": t.id,
            "public_ticket_id": t.public_ticket_id,
            "user_id": t.user_id,
            "event_id": t.event_id,
            "status": status,
            "risk_score": round(risk, 2),
            "risk_reasons": risk_reasons,
            "last_scanned": t.checked_in_at,
        })
    return result

# ---------- Recent Activities ----------
@router.get("/activities/recent")
def recent_activities(admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    activities = []
    recent_tickets = db.query(Ticket).order_by(Ticket.issued_at.desc()).limit(10).all()
    for t in recent_tickets:
        event = db.query(Event).filter(Event.id == t.event_id).first()
        user = db.query(User).filter(User.id == t.user_id).first()
        activities.append({
            "type": "purchase",
            "ticket_id": t.id,
            "attendee_id": t.user_id,
            "timestamp": t.issued_at.isoformat(),
            "details": f"{user.full_name} bought ticket for {event.name}" if user and event else "",
            "venue": event.venue if event else None,
        })

    audits = db.query(AuditLog).filter(AuditLog.result == "VALID").order_by(AuditLog.created_at.desc()).limit(5).all()
    for a in audits:
        ticket = db.query(Ticket).filter(Ticket.public_ticket_id == a.public_ticket_id).first()
        if ticket:
            event = db.query(Event).filter(Event.id == ticket.event_id).first()
            user = db.query(User).filter(User.id == ticket.user_id).first()
            activities.append({
                "type": "checkin",
                "ticket_id": ticket.id,
                "attendee_id": ticket.user_id,
                "timestamp": a.created_at.isoformat(),
                "details": f"{user.full_name} checked in to {event.name}" if user and event else "",
                "venue": event.venue if event else None,
            })

    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities[:20]

# ---------- Upload ----------
@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    ext = file.filename.split(".")[-1]
    filename = f"{secrets.token_hex(8)}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"/uploads/{filename}"}