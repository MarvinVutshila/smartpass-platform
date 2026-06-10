from sqlalchemy.orm import Session
from app.events import models

def get_all_events(db: Session, skip=0, limit=100):
    return db.query(models.Event).offset(skip).limit(limit).all()

def get_event_by_id(db: Session, event_id: int):
    return db.query(models.Event).filter(models.Event.id == event_id).first()

def create_event(db: Session, event_data):
    event = models.Event(**event_data.dict())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event