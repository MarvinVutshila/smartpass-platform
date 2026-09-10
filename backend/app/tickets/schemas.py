# app/tickets/schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


# ══════════════════════════════════════════════════════════════════
#  TICKET OUTPUT
# ══════════════════════════════════════════════════════════════════

class TicketOut(BaseModel):
    """Public-facing ticket representation returned to the ticket owner."""
    id: int
    public_ticket_id: str
    order_ref: str
    event_id: int
    event_name: Optional[str] = None
    venue: Optional[str] = None
    ticket_type: str
    status: str
    qr_image_url: Optional[str] = None
    price_paid: float
    issued_at: datetime
    expires_at: datetime
    checked_in_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════════
#  ADMIN / FRAUD VIEW
# ══════════════════════════════════════════════════════════════════

class TicketAdminOut(BaseModel):
    """Extended ticket representation for admin dashboards."""
    ticket_id: int
    public_ticket_id: str
    user_id: int
    event_id: int
    status: str
    risk_score: float = 0.0
    risk_reasons: list[str] = []
    last_scanned: Optional[datetime] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════════
#  CHECKOUT
# ══════════════════════════════════════════════════════════════════

class CheckoutRequest(BaseModel):
    """Used by the /checkout endpoint (test tickets) and payment flow."""
    event_id: int
    ticket_type: str = "General Admission"


# ══════════════════════════════════════════════════════════════════
#  PAYMENT
# ══════════════════════════════════════════════════════════════════

class InitPaymentRequest(BaseModel):
    event_id: int
    ticket_type: str
    amount: float = Field(..., gt=0, description="Amount in ZAR (not cents)")


class PaymentOut(BaseModel):
    id: int
    reference: str
    amount: float
    currency: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════════
#  CHECK-IN
# ══════════════════════════════════════════════════════════════════

class CheckinRequest(BaseModel):
    credential: str
    event_id: Optional[int] = None


class CheckinResponse(BaseModel):
    result: str   # VALID, INVALID, REVOKED, WRONG_EVENT, ALREADY_USED
    message: str
    ticket_type: Optional[str] = None
    attendee_name: Optional[str] = None
    event_name: Optional[str] = None
    checked_in_at: Optional[datetime] = None


# ══════════════════════════════════════════════════════════════════
#  VERIFICATION (public)
# ══════════════════════════════════════════════════════════════════

class VerificationOut(BaseModel):
    status: str   # VALID, USED, EXPIRED, REVOKED, INVALID
    message: str
    ticket_id: Optional[str] = None
    event_name: Optional[str] = None
    attendee_name: Optional[str] = None
    ticket_type: Optional[str] = None
    checked_in_at: Optional[datetime] = None
    issued_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None