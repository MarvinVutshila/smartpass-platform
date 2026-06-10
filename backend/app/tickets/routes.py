from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.users import models as user_models
from app.tickets import services, models

router = APIRouter()

class TicketOut(BaseModel):
    id: int
    event_id: int
    qr_image_url: str
    status: str
    price_paid: float
    purchase_date: str

class RecentTicketOut(BaseModel):
    id: int
    event_name: str
    user_email: str
    price_paid: float
    purchase_date: str

@router.get("/me", response_model=List[TicketOut])
def my_tickets(current_user: user_models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    tickets = services.get_user_tickets(db, current_user.id)
    return tickets

@router.get("/recent", response_model=List[RecentTicketOut])
def recent_tickets(db: Session = Depends(get_db), current_admin: user_models.User = Depends(get_current_admin)):
    """Get the 10 most recent ticket purchases (admin only)"""
    tickets = db.query(models.Ticket).order_by(models.Ticket.purchase_date.desc()).limit(10).all()
    result = []
    for ticket in tickets:
        event = ticket.event
        user = ticket.user
        result.append({
            "id": ticket.id,
            "event_name": event.name if event else "Unknown",
            "user_email": user.email if user else "Unknown",
            "price_paid": ticket.price_paid,
            "purchase_date": ticket.purchase_date.isoformat()
        })
    return result