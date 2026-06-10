from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.events import routes as events
from app.tickets import routes as tickets
from app.payments import routes as payments
from app.admin import routes as admin
from app.users import routes as users

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SmartPass Platform API", version="1.0.0")

# Allow all localhost ports (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",   # matches any port on localhost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["tickets"])
app.include_router(payments.router, prefix="/api", tags=["payments"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(users.router, prefix="/api/auth", tags=["auth"])

@app.get("/health")
def health():
    return {"status": "ok"}

