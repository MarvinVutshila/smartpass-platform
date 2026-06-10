from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.users import models as user_models
from app.events import services as event_services
from app.payments import services

router = APIRouter()

class CheckoutRequest(BaseModel):
    event_id: int

@router.post("/checkout")
async def checkout(req: CheckoutRequest, current_user: user_models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = event_services.get_event_by_id(db, req.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    result = await services.process_payment(current_user.id, req.event_id, event.ticket_price, db)
    return result
