"""
QR Client for external QR generation and fraud detection service.
Used by staff to scan tickets and get fraud risk scores.
"""

import httpx
from app.core.config import settings

class QRClient:
    def __init__(self):
        self.base_url = settings.QR_ENGINE_URL
        self.api_key = settings.QR_ENGINE_API_KEY

    async def generate_qr(self, ticket_type: str, scan_limit: int, expiry: str, metadata: dict):
        """
        Generate a QR code via the external engine.
        Returns the QR code ID and image URL (or other data).
        """
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/generate",
                json={
                    "type": ticket_type,
                    "scan_limit": scan_limit,
                    "expiry": expiry,
                    "metadata": metadata
                },
                headers={"X-API-Key": self.api_key}
            )
            resp.raise_for_status()
            return resp.json()

    async def revoke_qr(self, qr_code_id: str):
        """
        Revoke a previously generated QR code.
        """
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{self.base_url}/revoke/{qr_code_id}",
                headers={"X-API-Key": self.api_key}
            )

    async def get_fraud_score(self, qr_code_id: str) -> float:
        """
        Get a fraud risk score (0.0 to 1.0) for a QR code.
        """
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/fraud/{qr_code_id}",
                headers={"X-API-Key": self.api_key}
            )
            return resp.json().get("risk_score", 0.0)

    async def verify_qr(self, qr_code_id: str) -> dict:
        """
        Verify if a QR code is still valid (not revoked, not expired).
        """
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/verify/{qr_code_id}",
                headers={"X-API-Key": self.api_key}
            )
            return resp.json()

# Singleton instance
qr_client = QRClient()