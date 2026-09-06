from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.events.services import get_events, get_event
from app.events.schemas import EventOut

router = APIRouter(prefix="/api/events", tags=["events"])

@router.get("/", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db)):
    return get_events(db, upcoming_only=True)

@router.get("/{event_id}", response_model=EventOut)
def get_event_detail(event_id: int, db: Session = Depends(get_db)):
    event = get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event