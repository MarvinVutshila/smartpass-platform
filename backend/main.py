from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.database import engine, Base
from app.core.config import settings
from app.users.routes import router as auth_router
from app.events.routes import router as events_router
from app.tickets.routes import router as tickets_router
from app.payments.routes import router as payments_router
from app.admin.routes import router as admin_router

# Create tables (if not using Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SmartPass API")

# Mount static files
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# CORS – allow localhost and your LAN IP for mobile testing
# Add your computer's LAN IP (e.g., 172.30.85.204) to the list below
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://172.30.85.204:3000",   # <-- your LAN IP + frontend port
    # Add more IPs/ports as needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(events_router)
app.include_router(tickets_router)
app.include_router(admin_router)
app.include_router(payments_router)

@app.get("/health")
def health():
    return {"status": "ok"}