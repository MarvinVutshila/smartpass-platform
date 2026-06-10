import httpx
from app.core.config import settings

class QRClient:
    def __init__(self):
        self.base_url = settings.QR_ENGINE_URL
        self.api_key = settings.QR_ENGINE_API_KEY

    async def generate_qr(self, ticket_type: str, scan_limit: int, expiry: str, metadata: dict):
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/generate",
                json={"type": ticket_type, "scan_limit": scan_limit, "expiry": expiry, "metadata": metadata},
                headers={"X-API-Key": self.api_key}
            )
            resp.raise_for_status()
            return resp.json()

    async def revoke_qr(self, qr_code_id: str):
        async with httpx.AsyncClient() as client:
            await client.post(f"{self.base_url}/revoke/{qr_code_id}", headers={"X-API-Key": self.api_key})

    async def get_fraud_score(self, qr_code_id: str) -> float:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.base_url}/fraud/{qr_code_id}", headers={"X-API-Key": self.api_key})
            return resp.json().get("risk_score", 0.0)

qr_client = QRClient()