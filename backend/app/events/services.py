from sqlalchemy.orm import Session
from app.events.models import Event, TicketTier
from app.events.schemas import EventCreate

def get_event(db: Session, event_id: int):
    return db.query(Event).filter(Event.id == event_id).first()

def get_events(db: Session, upcoming_only: bool = True):
    query = db.query(Event).order_by(Event.start_date)
    if upcoming_only:
        from datetime import datetime
        query = query.filter(Event.start_date > datetime.utcnow())
    return query.all()

def create_event(db: Session, event_data: EventCreate, admin_id: int):
    # compute capacity and min price from tiers
    if event_data.tiers:
        total_capacity = sum(t.capacity for t in event_data.tiers)
        min_price = min(t.price for t in event_data.tiers)
    else:
        total_capacity = 0
        min_price = 0.0

    event = Event(
        name=event_data.name,
        description=event_data.description,
        venue=event_data.venue,
        start_date=event_data.start_date,
        end_date=event_data.end_date,
        category=event_data.category,
        ticket_price=min_price,
        capacity=total_capacity,
        image_url=event_data.image_url,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    for tier_data in event_data.tiers:
        tier = TicketTier(
            event_id=event.id,
            name=tier_data.name,
            description=tier_data.description,
            price=tier_data.price,
            capacity=tier_data.capacity,
            benefits=tier_data.benefits,
        )
        db.add(tier)
    db.commit()
    db.refresh(event)
    return event

def update_event(db: Session, event_id: int, event_data: EventCreate):
    event = get_event(db, event_id)
    if not event:
        return None
    event.name = event_data.name
    event.description = event_data.description
    event.venue = event_data.venue
    event.start_date = event_data.start_date
    event.end_date = event_data.end_date
    event.category = event_data.category
    event.image_url = event_data.image_url
    # tiers are updated separately in admin routes
    db.commit()
    db.refresh(event)
    return event

def delete_event(db: Session, event_id: int):
    event = get_event(db, event_id)
    if not event:
        return False
    db.delete(event)
    db.commit()
    return True