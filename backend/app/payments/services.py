import httpx
import json
import secrets
from sqlalchemy.orm import Session
from app.tickets.models import Payment
from app.core.config import settings

async def initialize_paystack_transaction(db: Session, user, event, ticket_type, amount):
    reference = f"SP-{secrets.token_hex(8).upper()}"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.paystack.co/transaction/initialize",
            headers={
                "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "email": user.email,
                "amount": int(amount * 100),  # cents
                "currency": "ZAR",
                "reference": reference,
                "callback_url": settings.PAYSTACK_CALLBACK_URL,
                "metadata": {
                    "user_id": user.id,
                    "event_id": event.id,
                    "ticket_type": ticket_type,
                }
            }
        )
        data = resp.json()
    if not data.get("status"):
        raise ValueError(data.get("message", "Paystack error"))

    payment = Payment(
        reference=reference,
        user_id=user.id,
        event_id=event.id,
        ticket_type=ticket_type,
        amount=amount,
        status="pending",
        paystack_data=json.dumps(data["data"])
    )
    db.add(payment)
    db.commit()
    return reference, data["data"]["authorization_url"]