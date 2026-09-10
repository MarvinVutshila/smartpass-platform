from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.users.models import User
from app.events.models import Event, TicketTier   # added TicketTier
from app.tickets.models import Ticket, Payment
from app.tickets.services import issue_ticket, send_ticket_email
from app.payments.services import initialize_paystack_transaction
from app.core.config import settings
import hmac
import hashlib
import json
import httpx
import secrets   # added for test ticket refs

router = APIRouter(prefix="/api/payments", tags=["payments"])

class InitPaymentRequest(BaseModel):
    event_id: int
    ticket_type: str
    amount: float

class CheckoutRequest(BaseModel):   # new
    event_id: int
    ticket_type: str

# ─── Initialize Paystack payment ───────────────────────────────
@router.post("/paystack/initialize")
async def init_paystack(
    req: InitPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == req.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    try:
        reference, auth_url = await initialize_paystack_transaction(db, current_user, event, req.ticket_type, req.amount)
        return {"authorization_url": auth_url, "reference": reference}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ─── Paystack Webhook ────────────────────────────────────────────
@router.post("/paystack/webhook")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)):
    # Verify signature
    payload = await request.body()
    signature = request.headers.get("x-paystack-signature")
    expected = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode(),
        payload,
        hashlib.sha512
    ).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=403, detail="Invalid signature")

    data = await request.json()
    event_type = data.get("event")
    if event_type == "charge.success":
        tx = data["data"]
        reference = tx["reference"]
        metadata = tx["metadata"]

        payment = db.query(Payment).filter(Payment.reference == reference).first()
        if not payment or payment.status == "success":
            return {"status": "ignored"}

        # ✅ Check if ticket already exists to prevent duplicates
        existing_ticket = db.query(Ticket).filter(Ticket.order_ref == reference).first()
        if existing_ticket:
            payment.status = "success"
            payment.paystack_data = json.dumps(tx)
            db.commit()
            return {"status": "already_created"}

        # Issue ticket
        user = db.query(User).filter(User.id == metadata["user_id"]).first()
        event = db.query(Event).filter(Event.id == metadata["event_id"]).first()
        if not user or not event:
            payment.status = "failed"
            payment.paystack_data = json.dumps(tx)
            db.commit()
            return {"status": "failed"}

        ticket, credential = issue_ticket(
            db=db,
            user=user,
            event=event,
            ticket_type=metadata["ticket_type"],
            price=float(tx["amount"]) / 100,
            order_ref=reference   # ✅ use payment reference as order_ref
        )

        payment.status = "success"
        payment.paystack_data = json.dumps(tx)
        db.commit()

        # Send email
        send_ticket_email(user.email, user, event, ticket, credential)

    return {"status": "ok"}

# ─── Verify Payment (and create ticket if needed) ──────────────
@router.get("/paystack/verify/{reference}")
async def verify_payment(
    reference: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.reference == reference).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Check for existing ticket (by order_ref)
    existing_ticket = db.query(Ticket).filter(Ticket.order_ref == reference).first()
    if existing_ticket:
        return {"status": "success", "amount": payment.amount, "ticket_id": existing_ticket.id}

    # If payment is already successful but no ticket, create it now
    if payment.status == "success":
        user = db.query(User).filter(User.id == payment.user_id).first()
        event = db.query(Event).filter(Event.id == payment.event_id).first()
        if not user or not event:
            raise HTTPException(status_code=404, detail="User or Event not found")
        try:
            ticket, credential = issue_ticket(
                db=db,
                user=user,
                event=event,
                ticket_type=payment.ticket_type,
                price=payment.amount,
                order_ref=reference   # ✅ pass reference
            )
            db.commit()
            return {"status": "success", "amount": payment.amount, "ticket_id": ticket.id}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create ticket: {str(e)}")

    # Otherwise, verify with Paystack API
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.paystack.co/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}
        )
        data = resp.json()

    if data.get("status") and data["data"]["status"] == "success":
        # Update payment
        payment.status = "success"
        payment.paystack_data = json.dumps(data["data"])
        db.commit()

        # Create ticket
        user = db.query(User).filter(User.id == payment.user_id).first()
        event = db.query(Event).filter(Event.id == payment.event_id).first()
        if not user or not event:
            raise HTTPException(status_code=404, detail="User or Event not found")
        try:
            ticket, credential = issue_ticket(
                db=db,
                user=user,
                event=event,
                ticket_type=payment.ticket_type,
                price=payment.amount,
                order_ref=reference   # ✅ pass reference
            )
            db.commit()
            return {"status": "success", "amount": payment.amount, "ticket_id": ticket.id}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create ticket: {str(e)}")
    else:
        return {"status": "failed", "amount": payment.amount}

# ─── Test Ticket Endpoint (for admin "Test Ticket" button) ─────
@router.post("/checkout")   # This will be at /api/payments/checkout (adjust frontend if needed)
def create_test_ticket(
    req: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == req.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Find the matching tier (or fallback)
    tier = db.query(TicketTier).filter(
        TicketTier.event_id == event.id,
        TicketTier.name == req.ticket_type
    ).first()
    if not tier:
        price = event.ticket_price or 0.0
        tier_name = req.ticket_type or "General Admission"
        tier_id = None
    else:
        price = tier.price
        tier_name = tier.name
        tier_id = tier.id

    try:
        # Use a unique reference for test tickets
        test_ref = f"TEST-{secrets.token_hex(6).upper()}"
        ticket, credential = issue_ticket(
            db=db,
            user=current_user,
            event=event,
            ticket_type=tier_name,
            price=price,
            tier_id=tier_id,
            order_ref=test_ref
        )
        return {
            "message": "Test ticket created",
            "ticket_id": ticket.id,
            "public_id": ticket.public_ticket_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")