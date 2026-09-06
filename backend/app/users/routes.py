from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm  # <-- added
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.users.schemas import UserCreate, UserOut, Token, ForgotPasswordRequest, ResetPasswordRequest
from app.users.services import create_user, authenticate_user, send_reset_email, create_reset_token, get_email_from_reset_token, clear_reset_token, get_user_by_email
from app.core.security import get_password_hash
from security import rate_limit, AUTH_RULE

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_user(db, user)

@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    rate_limit(request, AUTH_RULE, "login")
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(request: Request, req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    rate_limit(request, AUTH_RULE, "forgot-password")
    user = get_user_by_email(db, req.email)
    if not user:
        return {"message": "If that email exists, a reset link was sent."}
    token = create_reset_token(user.email)
    send_reset_email(user.email, token)
    return {"message": "If that email exists, a reset link was sent."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = get_email_from_reset_token(req.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    clear_reset_token(email)
    return {"message": "Password updated successfully"}