from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_admin
from app.users import models as user_models
from app.admin import services
from app.tickets import services as ticket_services

router = APIRouter()   # ← THIS LINE WAS MISSING

@router.get("/analytics")
async def analytics(admin: user_models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return services.get_analytics(db)

@router.get("/fraud")
async def fraud(admin: user_models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return await services.get_fraud_list(db)

@router.post("/tickets/{ticket_id}/block")
def block_ticket(ticket_id: int, admin: user_models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    ticket = ticket_services.block_ticket(db, ticket_id)
    return {"status": "blocked", "ticket_id": ticket_id}