# backfill_credentials.py
from app.core.database import SessionLocal
from app.tickets.models import Ticket
from app.tickets.services import rebuild_credential, _payload_from_ticket
from crypto_ticket import credential_sha256

db = SessionLocal()
tickets = db.query(Ticket).filter(Ticket.credential.is_(None)).all()
print(f"Found {len(tickets)} tickets without credential")

for t in tickets:
    try:
        credential = rebuild_credential(_payload_from_ticket(t))
        t.credential = credential
        # Update hash to be safe
        t.credential_hash = credential_sha256(credential)
        db.add(t)
    except Exception as e:
        print(f"❌ Error updating ticket {t.id}: {e}")

db.commit()
print(f"✅ Updated {len(tickets)} tickets")