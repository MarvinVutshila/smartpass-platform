from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from crypto_ticket import generate_public_ticket_id

class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        Index("ix_tickets_event_status", "event_id", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    public_ticket_id = Column(String(64), unique=True, index=True, nullable=False, default=generate_public_ticket_id)
    order_ref = Column(String(32), nullable=False)

    event_id = Column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    tier_id = Column(Integer, ForeignKey("ticket_tiers.id"), nullable=True)
    ticket_type = Column(String(64), default="General Admission")
    status = Column(String(16), default="active", index=True)
    price_paid = Column(Float)

    # ✅ NEW: Store the full credential string
    credential = Column(Text, nullable=True)   # <-- ADD THIS LINE

    credential_nonce = Column(String(32), nullable=False)
    credential_hash = Column(String(64), nullable=False)

    issued_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=False)

    checked_in_at = Column(DateTime, nullable=True)
    checked_in_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    revoked_at = Column(DateTime, nullable=True)
    revoked_reason = Column(String(255), nullable=True)
    revoked_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    public_ticket_id = Column(String(64), nullable=True, index=True)
    event_id = Column(Integer, nullable=True, index=True)
    result = Column(String(20), nullable=False)
    reason = Column(String(255), nullable=True)
    scanned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now(), index=True)

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    ticket_type = Column(String(64), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="ZAR")
    status = Column(String(20), default="pending")  # pending, success, failed
    paystack_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())