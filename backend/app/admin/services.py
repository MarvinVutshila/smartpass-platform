# app/admin/services.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.tickets import models as ticket_models
from app.events import models as event_models
from app.tickets.qr_client import qr_client
from app.tickets.services import _computed_status
import logging

logger = logging.getLogger(__name__)

async def get_fraud_list(db: Session, limit: int = 50):
    """
    Returns a list of recent tickets with a fraud risk score (0.0–1.0)
    obtained from the external QR engine. Also includes the ticket status
    and reasons.
    """
    tickets = db.query(ticket_models.Ticket).order_by(ticket_models.Ticket.id.desc()).limit(limit).all()
    result = []

    for ticket in tickets:
        # Compute status using the existing helper
        status = _computed_status(ticket)

        # Build risk assessment based on actual state
        risk_reasons = []
        risk_score = 0.0

        if status == "revoked":
            risk_score = 0.9
            risk_reasons.append("Ticket revoked")
        elif status == "expired":
            risk_score = 0.6
            risk_reasons.append("Ticket expired")
        elif status == "checked_in":
            risk_score = 0.2
            risk_reasons.append("Already used")
        else:
            # Active ticket – check if it's been unused for a long time
            from datetime import datetime, timedelta
            if ticket.issued_at and (datetime.utcnow() - ticket.issued_at) > timedelta(days=1):
                risk_score = 0.3
                risk_reasons.append("Unused for >24h")
            else:
                risk_score = 0.0
                risk_reasons.append("Active")

        # Optionally, if you have a QR code ID, ask the external engine
        # for a fraud score (this is async; keep it optional)
        if hasattr(ticket, 'qr_code_id') and ticket.qr_code_id:
            try:
                external_score = await qr_client.get_fraud_score(ticket.qr_code_id)
                if external_score > 0.5:
                    risk_score = max(risk_score, external_score)
                    risk_reasons.append("External engine flagged")
            except Exception as e:
                logger.warning(f"Failed to get fraud score from QR engine: {e}")

        # Ensure score is between 0 and 1
        risk_score = min(max(risk_score, 0.0), 1.0)

        result.append({
            "ticket_id": ticket.id,
            "public_ticket_id": ticket.public_ticket_id,
            "user_id": ticket.user_id,
            "event_id": ticket.event_id,
            "status": status,
            "risk_score": round(risk_score, 2),
            "risk_reasons": risk_reasons,
            "last_scanned": ticket.checked_in_at,
        })

    return result


def get_analytics(db: Session):
    """
    Returns platform-wide analytics: total sales, revenue, and per‑event breakdown.
    """
    total_sales = db.query(ticket_models.Ticket).count()
    total_revenue = db.query(func.sum(ticket_models.Ticket.price_paid)).scalar() or 0.0

    events_stats = []
    for event in db.query(event_models.Event).all():
        sold = db.query(ticket_models.Ticket).filter(
            ticket_models.Ticket.event_id == event.id
        ).count()
        events_stats.append({
            "event_id": event.id,
            "name": event.name,
            "tickets_sold": sold,
            "capacity": event.capacity,
            "venue": event.venue,
        })

    return {
        "total_sales": total_sales,
        "total_revenue": float(total_revenue),
        "events": events_stats,
    }