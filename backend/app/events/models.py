from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    venue = Column(String, nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    category = Column(String, nullable=True)
    ticket_price = Column(Float, default=0.0)
    capacity = Column(Integer, default=100)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())

    tiers = relationship("TicketTier", back_populates="event", cascade="all, delete-orphan")

class TicketTier(Base):
    __tablename__ = "ticket_tiers"

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    name = Column(String(64), nullable=False)
    description = Column(String(255), nullable=True)
    price = Column(Float, nullable=False)
    capacity = Column(Integer, nullable=False)
    benefits = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now())

    event = relationship("Event", back_populates="tiers")