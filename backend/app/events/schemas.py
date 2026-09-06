from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class TicketTierCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    capacity: int
    benefits: Optional[str] = None

class TicketTierOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    capacity: int
    benefits: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True   # <-- changed

class EventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    venue: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    tiers: List[TicketTierCreate] = []

class EventOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    venue: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    tiers: List[TicketTierOut] = []
    created_at: datetime

    class Config:
        from_attributes = True  