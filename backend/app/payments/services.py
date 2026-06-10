from sqlalchemy.orm import Session
from app.tickets.services import create_ticket_after_payment

async def process_payment(user_id: int, event_id: int, amount: float, db: Session):
    # Mock payment always succeeds
    ticket = await create_ticket_after_payment(db, user_id, event_id, amount)
    return {"success": True, "ticket_id": ticket.id}
