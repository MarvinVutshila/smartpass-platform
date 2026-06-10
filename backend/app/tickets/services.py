from sqlalchemy.orm import Session
from app.tickets import models
from app.events import services as event_services
from app.tickets.qr_client import qr_client

async def create_ticket_after_payment(db: Session, user_id: int, event_id: int, price_paid: float):
    event = event_services.get_event_by_id(db, event_id)
    if not event:
        raise ValueError("Event not found")
    qr_data = await qr_client.generate_qr(
        ticket_type="ticket",
        scan_limit=1,
        expiry=event.end_date.isoformat(),
        metadata={"user_id": user_id, "event_id": event_id}
    )
    ticket = models.Ticket(
        user_id=user_id,
        event_id=event_id,
        qr_code_id=qr_data["qr_code_id"],
        qr_image_url=qr_data["qr_image_url"],
        price_paid=price_paid
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket

def get_user_tickets(db: Session, user_id: int):
    return db.query(models.Ticket).filter(models.Ticket.user_id == user_id).all()

def get_ticket_by_id(db: Session, ticket_id: int):
    return db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()

def block_ticket(db: Session, ticket_id: int):
    ticket = get_ticket_by_id(db, ticket_id)
    if ticket:
        ticket.status = models.TicketStatus.BLOCKED
        db.commit()
        # optionally call qr_client.revoke_qr
    return ticket