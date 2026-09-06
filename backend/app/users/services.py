from sqlalchemy.orm import Session
from app.users.models import User
from app.users.schemas import UserCreate
from app.core.security import get_password_hash, verify_password
from app.core.config import settings
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user_data: UserCreate):
    hashed = get_password_hash(user_data.password)
    role = "admin" if user_data.email in settings.ADMIN_EMAILS else ("staff" if user_data.email in settings.STAFF_EMAILS else "user")
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed,
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

reset_tokens = {}

def create_reset_token(email: str):
    token = secrets.token_urlsafe(32)
    reset_tokens[email] = token
    return token

def get_email_from_reset_token(token: str):
    for email, t in reset_tokens.items():
        if t == token:
            return email
    return None

def clear_reset_token(email: str):
    if email in reset_tokens:
        del reset_tokens[email]

def send_reset_email(to_email: str, token: str):
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    try:
        html_body = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #4338CA;">SmartPass</h2>
            <p>We received a request to reset your password. Click below:</p>
            <p><a href="{reset_link}" style="display:inline-block;background:#4338CA;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset password</a></p>
            <p style="font-size:0.9em;color:#64748B;">This link expires in 1 hour.</p>
        </body></html>
        """
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "SmartPass – Reset your password"
        msg["From"] = settings.SMTP_USER
        msg["To"] = to_email
        msg.attach(MIMEText(f"Reset your password: {reset_link}", "plain"))
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
    except Exception:
        import traceback
        traceback.print_exc()