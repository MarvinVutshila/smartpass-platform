from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.core.database import get_db
from app.events import services, models
from app.core.security import get_current_admin

router = APIRouter()

class EventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    venue: str
    capacity: int
    ticket_price: float

class EventOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    start_date: datetime
    end_date: datetime
    venue: str
    capacity: int
    ticket_price: float

@router.get("/", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db)):
    return services.get_all_events(db)

@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = services.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.post("/", response_model=EventOut, dependencies=[Depends(get_current_admin)])
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    return services.create_event(db, event)