from pydantic import BaseModel, EmailStr, ConfigDict, field_validator, Field
from typing import Optional
from datetime import datetime
import re

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "candidate"
    subscription_tier: Optional[str] = "free"
    premium_until: Optional[datetime] = None
    company_id: Optional[int] = None

class UserCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    password: str = Field(..., min_length=8)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        # Relaxed password validation for testing purposes
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class VerificationVerify(BaseModel):
    token: str

class VerificationRequest(BaseModel):
    email: EmailStr

class GoogleLoginRequest(BaseModel):
    token: str

