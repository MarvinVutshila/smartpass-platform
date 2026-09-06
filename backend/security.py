# security.py
import time
from collections import defaultdict
from fastapi import HTTPException, Request

# Simple in-memory rate limiting (development only – replace with Redis for production)
class RateLimiter:
    def __init__(self, limit, window_seconds):
        self.limit = limit
        self.window = window_seconds
        self.records = defaultdict(list)

    def check(self, key):
        now = time.time()
        self.records[key] = [t for t in self.records[key] if now - t < self.window]
        if len(self.records[key]) >= self.limit:
            return False
        self.records[key].append(now)
        return True

AUTH_RULE = RateLimiter(limit=10, window_seconds=60)
VERIFY_RULE = RateLimiter(limit=20, window_seconds=60)
PUBLIC_VERIFY_RULE = RateLimiter(limit=30, window_seconds=60)

def rate_limit(request: Request, limiter: RateLimiter, key_suffix: str):
    client_ip = request.client.host if request.client else "unknown"
    key = f"{client_ip}:{key_suffix}"
    if not limiter.check(key):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

def request_metadata(request: Request) -> dict:
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }