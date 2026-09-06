from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TicketOut(BaseModel):
    id: int
    public_ticket_id: str
    order_ref: str
    event_id: int
    event_name: Optional[str]
    venue: Optional[str]
    ticket_type: str
    status: str
    qr_image_url: Optional[str]
    price_paid: float
    issued_at: datetime
    expires_at: datetime
    checked_in_at: Optional[datetime]

    class Config:
        from_attributes = True  

class CheckoutRequest(BaseModel):
    event_id: int
    ticket_type: str = "General Admission"