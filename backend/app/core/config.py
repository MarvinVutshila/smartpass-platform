# app/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30

    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./smartpass.db")

    ADMIN_EMAILS = [e.strip() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]
    STAFF_EMAILS = [e.strip() for e in os.getenv("STAFF_EMAILS", "").split(",") if e.strip()]

    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")   # MUST MATCH YOUR FRONTEND PORT

    PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY")
    PAYSTACK_PUBLIC_KEY = os.getenv("PAYSTACK_PUBLIC_KEY")
    PAYSTACK_CALLBACK_URL = os.getenv("PAYSTACK_CALLBACK_URL", "http://localhost:5173/payment-success")

    UPLOAD_DIR = "uploads"

settings = Settings()