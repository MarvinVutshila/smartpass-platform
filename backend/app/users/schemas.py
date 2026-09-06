from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True   # V2

class Token(BaseModel):
    access_token: str
    token_type: str

    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# Added – this is what admin/routes.py needs
class RoleUpdate(BaseModel):
    role: str   # "user", "staff", "admin"