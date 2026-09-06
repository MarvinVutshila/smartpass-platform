# crypto_ticket.py
import base64
import secrets
import hashlib
import json
from datetime import datetime, timedelta
from typing import NamedTuple, Optional
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives import serialization
import os

# Load or generate private key
PRIVATE_KEY_B64 = os.getenv("ED25519_PRIVATE_KEY", "").strip()

if PRIVATE_KEY_B64:
    try:
        private_key_bytes = base64.b64decode(PRIVATE_KEY_B64)
        private_key = Ed25519PrivateKey.from_private_bytes(private_key_bytes)
    except Exception as e:
        print(f"⚠️ Failed to decode ED25519_PRIVATE_KEY: {e}")
        print("🔄 Generating a new key...")
        private_key = Ed25519PrivateKey.generate()
        private_key_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption()
        )
        b64 = base64.b64encode(private_key_bytes).decode()
        print(f"🔑 Generated ED25519_PRIVATE_KEY: {b64}")
        print("❗ Add this to your .env file to persist the key across restarts.")
else:
    private_key = Ed25519PrivateKey.generate()
    private_key_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption()
    )
    b64 = base64.b64encode(private_key_bytes).decode()
    print(f"🔑 Generated ED25519_PRIVATE_KEY: {b64}")
    print("❗ Add this to your .env file to persist the key across restarts.")

public_key = private_key.public_key()

class TicketPayload(NamedTuple):
    tid: str   # public_ticket_id
    eid: int   # event id
    iat: int   # issued at timestamp
    exp: int   # expiry timestamp
    n: str     # nonce

class CredentialInvalid(Exception):
    pass

def generate_public_ticket_id() -> str:
    return secrets.token_urlsafe(16)  # 22 characters

def credential_sha256(credential: str) -> str:
    return hashlib.sha256(credential.encode()).hexdigest()

def issue_ticket_credential(event_id: int, valid_hours: int = 12) -> tuple[str, TicketPayload, str]:
    nonce = secrets.token_urlsafe(16)
    tid = generate_public_ticket_id()
    iat = int(datetime.utcnow().timestamp())
    exp = int((datetime.utcnow() + timedelta(hours=valid_hours)).timestamp())
    payload = TicketPayload(tid=tid, eid=event_id, iat=iat, exp=exp, n=nonce)
    payload_dict = payload._asdict()
    payload_json = json.dumps(payload_dict, separators=(',', ':'))
    signature = private_key.sign(payload_json.encode())
    credential = base64.b64encode(payload_json.encode()).decode() + "." + base64.b64encode(signature).decode()
    credential_hash = credential_sha256(credential)
    return credential, payload, credential_hash

def verify_credential_signature(credential: str) -> TicketPayload:
    try:
        parts = credential.split('.')
        if len(parts) != 2:
            raise CredentialInvalid("Invalid credential format")
        payload_b64, sig_b64 = parts
        payload_json = base64.b64decode(payload_b64).decode()
        signature = base64.b64decode(sig_b64)
        public_key.verify(signature, payload_json.encode())
        data = json.loads(payload_json)
        required = {'tid', 'eid', 'iat', 'exp', 'n'}
        if not required.issubset(data.keys()):
            raise CredentialInvalid("Missing fields")
        now = int(datetime.utcnow().timestamp())
        if now > data['exp']:
            raise CredentialInvalid("Expired")
        return TicketPayload(tid=data['tid'], eid=data['eid'], iat=data['iat'], exp=data['exp'], n=data['n'])
    except Exception as e:
        raise CredentialInvalid(str(e))

def rebuild_credential(payload: TicketPayload) -> str:
    payload_dict = payload._asdict()
    payload_json = json.dumps(payload_dict, separators=(',', ':'))
    signature = private_key.sign(payload_json.encode())
    return base64.b64encode(payload_json.encode()).decode() + "." + base64.b64encode(signature).decode()