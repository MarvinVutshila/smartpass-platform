from sqlalchemy.orm import Session
from sqlalchemy import func   # ← import func from sqlalchemy
from app.tickets import models as ticket_models
from app.events import models as event_models
from app.tickets.qr_client import qr_client

async def get_fraud_list(db: Session):
    tickets = db.query(ticket_models.Ticket).all()
    result = []
    for t in tickets:
        score = await qr_client.get_fraud_score(t.qr_code_id)
        result.append({
            "ticket_id": t.id,
            "user_id": t.user_id,
            "event_id": t.event_id,
            "risk_score": score,
            "status": t.status.value
        })
    return result

def get_analytics(db: Session):
    total_sales = db.query(ticket_models.Ticket).count()
    # Use func.sum from sqlalchemy, not from db
    total_revenue = db.query(func.sum(ticket_models.Ticket.price_paid)).scalar() or 0.0
    events_stats = []
    for ev in db.query(event_models.Event).all():
        sold = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.event_id == ev.id).count()
        events_stats.append({"event_id": ev.id, "name": ev.name, "tickets_sold": sold})
    return {"total_sales": total_sales, "total_revenue": total_revenue, "events": events_stats}