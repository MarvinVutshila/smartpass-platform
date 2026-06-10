from datetime import datetime, timedelta
import bcrypt
from jose import jwt
from jose.exceptions import JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.users import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def _truncate_password(password: str) -> str:
    encoded = password.encode('utf-8')
    if len(encoded) > 72:
        encoded = encoded[:72]
        password = encoded.decode('utf-8', errors='ignore')
    return password

def verify_password(plain: str, hashed: str) -> bool:
    plain = _truncate_password(plain)
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def get_password_hash(password: str) -> str:
    password = _truncate_password(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    # Use integer timestamp to avoid datetime comparison issues
    expire = int((datetime.utcnow() + timedelta(days=7)).timestamp())
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        # If you still get "Signature has expired", uncomment the line below:
        # payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_exp": False})
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
    except JWTError as e:
        print(f"JWT verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_current_admin(current_user = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user