from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class TicketStatus(str, enum.Enum):
    ACTIVE = "active"
    USED = "used"
    BLOCKED = "blocked"

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    event_id = Column(Integer, ForeignKey("events.id"))
    qr_code_id = Column(String, unique=True)
    qr_image_url = Column(String)
    status = Column(Enum(TicketStatus), default=TicketStatus.ACTIVE)
    price_paid = Column(Float)
    purchase_date = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="tickets")
    event = relationship("Event", backref="tickets")