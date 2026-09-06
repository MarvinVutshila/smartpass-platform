# app/tickets/services.py
import secrets
import base64
from io import BytesIO
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.tickets.models import Ticket, Payment, AuditLog
from app.users.models import User
from app.events.models import Event
from app.core.config import settings
from crypto_ticket import issue_ticket_credential, rebuild_credential, credential_sha256, verify_credential_signature
from pdf_ticket import generate_ticket_pdf   # our premium generator
import qrcode
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import traceback
import os

def _payload_from_ticket(ticket: Ticket):
    from crypto_ticket import TicketPayload
    return TicketPayload(
        tid=ticket.public_ticket_id,
        eid=ticket.event_id,
        iat=int(ticket.issued_at.timestamp()),
        exp=int(ticket.expires_at.timestamp()),
        n=ticket.credential_nonce,
    )

def _qr_data_url(credential: str) -> str:
    qr = qrcode.make(credential)
    buf = BytesIO()
    qr.save(buf, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"

def _computed_status(ticket: Ticket) -> str:
    if ticket.revoked_at is not None:
        return "revoked"
    if ticket.status == "checked_in":
        return "checked_in"
    if ticket.expires_at is None or datetime.utcnow() > ticket.expires_at:
        return "expired"
    return "active"

def issue_ticket(db: Session, user: User, event: Event, ticket_type: str, price: float, tier_id: int = None):
    expires_at = event.end_date or (event.start_date + timedelta(hours=12))
    credential, payload, credential_hash = issue_ticket_credential(
        event_id=event.id,
        valid_hours=max(1, int((expires_at - datetime.utcnow()).total_seconds() // 3600) or 1),
    )
    signed_expiry = datetime.utcfromtimestamp(payload.exp)

    ticket = Ticket(
        public_ticket_id=payload.tid,
        order_ref="SP-" + secrets.token_hex(4).upper(),
        event_id=event.id,
        user_id=user.id,
        tier_id=tier_id,
        ticket_type=ticket_type,
        status="active",
        price_paid=price,
        credential=credential,  # store the credential
        credential_nonce=payload.n,
        credential_hash=credential_hash,
        issued_at=datetime.utcfromtimestamp(payload.iat),
        expires_at=signed_expiry,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket, credential

def _build_ticket_pdf(ticket: Ticket, user: User, event: Event, credential: str) -> bytes:
    """
    Generate the premium ticket PDF using the new generator.
    Returns bytes.
    """
    # Parse title lines
    words = event.name.split()
    title_line1 = words[0] if words else "Event"
    title_line2 = " ".join(words[1:]) if len(words) > 1 else ""

    # Build venue lines
    venue_lines = [event.venue] if event.venue else ["TBA"]
    if hasattr(event, 'address') and event.address:
        venue_lines.append(event.address)

    # Date and time formatting
    date_str = event.start_date.strftime("%d %B %Y")
    start_time = event.start_date.strftime("%H:%M")
    end_time = event.end_date.strftime("%H:%M") if event.end_date else "TBD"
    time_str = f"{start_time} - {end_time}"

    # QR data: the credential itself (signed) – this will be used for verification.
    qr_data = f"{settings.FRONTEND_URL}/verify?token={credential}"

    # Generate PDF using the premium generator
    pdf_path = f"/tmp/ticket_{ticket.id}.pdf"
    generate_ticket_pdf(
        title_line1=title_line1,
        title_line2=title_line2,
        tagline=event.description or "Live the Moment.",
        date_str=date_str,
        time_str=time_str,
        venue_lines=venue_lines,
        ticket_type=ticket.ticket_type,
        ticket_id=ticket.public_ticket_id,
        price=f"R{ticket.price_paid:.2f}",
        purchaser=user.full_name,
        date_purchased=ticket.issued_at.strftime("%d %B %Y"),
        qr_data=qr_data,
        website="www.smartpass.co.za",
        footer_note="NO REFUNDS • NO EXCHANGES",
        output_path=pdf_path,
    )
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
    os.remove(pdf_path)
    return pdf_bytes

def send_ticket_email(to_email: str, user: User, event: Event, ticket: Ticket, credential: str):
    try:
        pdf_bytes = _build_ticket_pdf(ticket, user, event, credential)
        msg = MIMEMultipart()
        msg["Subject"] = f"Your SmartPass Ticket – {event.name}"
        msg["From"] = settings.SMTP_USER
        msg["To"] = to_email
        html_body = f"""
        <html><body style="font-family: Arial, sans-serif;">
            <h2>Your ticket is ready</h2>
            <p>Hi {user.full_name},</p>
            <p>Thanks for your ticket to <strong>{event.name}</strong>. It's attached as a PDF.</p>
            <p>Show the QR code at the entrance for check-in.</p>
            <hr><p style="font-size:0.8em;color:#888;">SmartPass – digitally issued, cryptographically signed tickets</p>
        </body></html>
        """
        msg.attach(MIMEText(html_body, "html"))
        part = MIMEBase('application', 'octet-stream')
        part.set_payload(pdf_bytes)
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', 'attachment', filename=f'ticket-{ticket.public_ticket_id}.pdf')
        msg.attach(part)
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
    except Exception:
        traceback.print_exc()

# ─── NEW: Verify and audit helpers for staff check‑in ─────────────────

def _verify_ticket(db: Session, credential: str):
    """
    Verify the credential signature and return (ticket, payload, error).
    error is a string if invalid, else None.
    """
    try:
        payload = verify_credential_signature(credential)
    except Exception as e:
        return None, None, str(e)

    ticket = db.query(Ticket).filter(Ticket.public_ticket_id == payload.tid).first()
    if not ticket:
        return None, payload, "Ticket not found"

    if credential_sha256(credential) != ticket.credential_hash:
        return None, payload, "Hash mismatch"

    if ticket.event_id != payload.eid:
        return None, payload, "Event mismatch"

    return ticket, payload, None

def _log_audit(db: Session, public_ticket_id, event_id, result, reason, scanned_by, meta):
    """
    Log an audit entry.
    """
    entry = AuditLog(
        public_ticket_id=public_ticket_id,
        event_id=event_id,
        result=result,
        reason=reason,
        scanned_by=scanned_by,
        ip_address=meta.get("ip_address"),
        user_agent=meta.get("user_agent"),
    )
    db.add(entry)
    db.commit()