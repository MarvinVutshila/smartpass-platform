"""
qr_client.py – Async client for the external QR generation / fraud-detection
service, used by staff to scan tickets and get fraud risk scores.

Upgrades vs. the original:
  • One pooled httpx.AsyncClient (reused across calls) instead of opening a
    brand-new TCP/TLS connection for every request.
  • Configurable timeouts, so a slow/hung upstream can't hang a request
    forever.
  • Automatic retry with exponential backoff + jitter on transient network
    errors and 5xx responses (not on 4xx — those are real client errors).
  • Every response is checked and turned into typed pydantic models instead
    of raw dicts, so callers get autocomplete + validation instead of
    `.get("risk_score", 0.0)`-style guessing.
  • A small custom exception hierarchy (QRClientError / QRAuthError /
    QRNotFoundError / QRServiceError) so callers can catch precisely what
    they care about, instead of a bare httpx error or a silent 0.0.
  • Usable as an async context manager, and safe to use as the existing
    module-level singleton.
"""

from __future__ import annotations

import asyncio
import logging
import random
from typing import Any, Optional

import httpx
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger("qr_client")


# ─── Typed responses ──────────────────────────────────────────────────
class QRGenerateResult(BaseModel):
    qr_code_id: str
    image_url: Optional[str] = None
    raw: dict[str, Any] = Field(default_factory=dict)  # full payload, for anything not modeled yet


class QRVerifyResult(BaseModel):
    valid: bool
    revoked: bool = False
    expired: bool = False
    scans_used: Optional[int] = None
    scan_limit: Optional[int] = None
    raw: dict[str, Any] = Field(default_factory=dict)


class QRFraudResult(BaseModel):
    risk_score: float = 0.0
    raw: dict[str, Any] = Field(default_factory=dict)


# ─── Exceptions ────────────────────────────────────────────────────────
class QRClientError(Exception):
    """Base error for anything the QR engine client raises."""


class QRAuthError(QRClientError):
    """401/403 from the QR engine — bad or expired API key."""


class QRNotFoundError(QRClientError):
    """404 — the qr_code_id doesn't exist (or was already revoked/purged)."""


class QRServiceError(QRClientError):
    """5xx, timeout, or connection failure after retries were exhausted."""


class QRClient:
    """Thin async wrapper around the external QR engine.

    Safe to use as the module-level singleton below, or per-request:

        async with QRClient() as qr:
            result = await qr.verify_qr(qr_code_id)

    Or, with the singleton, call `await qr_client.aclose()` on app shutdown.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 5.0,
        max_retries: int = 3,
    ):
        self.base_url = (base_url or settings.QR_ENGINE_URL).rstrip("/")
        self.api_key = api_key or settings.QR_ENGINE_API_KEY
        self.max_retries = max_retries
        self._timeout = httpx.Timeout(timeout, connect=timeout)
        self._client: Optional[httpx.AsyncClient] = None

    # ── lifecycle ──────────────────────────────────────────────────────
    async def __aenter__(self) -> "QRClient":
        return self

    async def __aexit__(self, *exc_info) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    def _get_client(self) -> httpx.AsyncClient:
        # Lazily created, then reused: one pooled connection instead of a
        # new TCP/TLS handshake per call.
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self._timeout,
                headers={"X-API-Key": self.api_key},
            )
        return self._client

    # ── core request helper: retries + error mapping live in one place ──
    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        client = self._get_client()
        last_exc: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                resp = await client.request(method, path, **kwargs)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_exc = exc
                logger.warning(
                    "QR engine %s %s failed (attempt %d/%d): %s",
                    method, path, attempt, self.max_retries, exc,
                )
            else:
                if resp.status_code in (401, 403):
                    raise QRAuthError(f"QR engine rejected the API key ({resp.status_code})")
                if resp.status_code == 404:
                    raise QRNotFoundError(f"QR code not found: {path}")
                if resp.status_code < 500:
                    resp.raise_for_status()
                    return resp
                # 5xx: treat as transient and retry
                last_exc = QRServiceError(f"QR engine returned {resp.status_code} for {path}")
                logger.warning(
                    "QR engine %s %s returned %s (attempt %d/%d)",
                    method, path, resp.status_code, attempt, self.max_retries,
                )

            if attempt < self.max_retries:
                backoff = (0.3 * 2 ** (attempt - 1)) + random.uniform(0, 0.2)
                await asyncio.sleep(backoff)

        raise QRServiceError(
            f"QR engine {method} {path} failed after {self.max_retries} attempts"
        ) from last_exc

    # ── public API ───────────────────────────────────────────────────
    async def generate_qr(
        self, ticket_type: str, scan_limit: int, expiry: str, metadata: dict
    ) -> QRGenerateResult:
        """Generate a QR code via the external engine."""
        resp = await self._request(
            "POST",
            "/generate",
            json={
                "type": ticket_type,
                "scan_limit": scan_limit,
                "expiry": expiry,
                "metadata": metadata,
            },
        )
        payload = resp.json()
        return QRGenerateResult(
            qr_code_id=payload["qr_code_id"],
            image_url=payload.get("image_url"),
            raw=payload,
        )

    async def revoke_qr(self, qr_code_id: str) -> None:
        """Revoke a previously generated QR code. Raises QRClientError on failure."""
        await self._request("POST", f"/revoke/{qr_code_id}")

    async def get_fraud_score(self, qr_code_id: str) -> float:
        """Fraud risk score (0.0-1.0) for a QR code. Returns 0.0 (not an
        exception) if the code is unknown, since 'no data yet' is a normal,
        expected case for a brand-new code — callers scanning a fresh
        ticket shouldn't have to special-case a 404."""
        try:
            resp = await self._request("GET", f"/fraud/{qr_code_id}")
        except QRNotFoundError:
            return 0.0
        payload = resp.json()
        return QRFraudResult(risk_score=payload.get("risk_score", 0.0), raw=payload).risk_score

    async def verify_qr(self, qr_code_id: str) -> QRVerifyResult:
        """Verify whether a QR code is still valid (not revoked, not expired)."""
        resp = await self._request("GET", f"/verify/{qr_code_id}")
        payload = resp.json()
        return QRVerifyResult(
            valid=payload.get("valid", False),
            revoked=payload.get("revoked", False),
            expired=payload.get("expired", False),
            scans_used=payload.get("scans_used"),
            scan_limit=payload.get("scan_limit"),
            raw=payload,
        )


# Module-level singleton — reuses one pooled connection for the app's
# lifetime. Call `await qr_client.aclose()` in your FastAPI shutdown hook.
qr_client = QRClient()