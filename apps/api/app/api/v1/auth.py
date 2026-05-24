from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.user import User
from app.schemas.auth import UserCreate, UserResponse, Token, VerificationRequest, VerificationVerify
from app.services.auth_service import AuthService, get_db, get_current_user
import uuid
import logging

logger = logging.getLogger(__name__)

from app.utils.rate_limit import limiter

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    query = await db.execute(select(User).where(User.email == user_in.email))
    if query.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    
    hashed_password = AuthService.get_password_hash(user_in.password)
    verification_token = str(uuid.uuid4())
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        role="candidate",
        is_active=True,
        is_verified=False,
        verification_token=verification_token
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    # Mock sending email
    logger.info(f"Send verification email to {db_user.email} with token: {verification_token}")
    
    return db_user

@router.post("/verify-email")
async def verify_email(req: VerificationVerify, db: AsyncSession = Depends(get_db)):
    query = await db.execute(select(User).where(User.verification_token == req.token))
    user = query.scalars().first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
        
    user.is_verified = True
    user.verification_token = None
    await db.commit()
    return {"message": "Email verified successfully"}

from app.schemas.auth import GoogleLoginRequest
import secrets

@router.post("/google", response_model=Token)
async def google_login(req: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    # In a real application, verify the Google token with google-auth library
    # mock verification for this demo
    logger.info(f"Mock verifying Google token: {req.token}")
    
    # We'll just assume the token is the user's email for mocking purposes
    email = req.token if "@" in req.token else "mockuser@gmail.com"
    full_name = "Google User"
    
    query = await db.execute(select(User).where(User.email == email))
    user = query.scalars().first()
    
    if not user:
        # Create a new user with Google Auth
        # Provide a random secure password since they use OAuth
        random_password = secrets.token_urlsafe(32)
        hashed_password = AuthService.get_password_hash(random_password)
        user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            role="candidate",
            is_active=True,
            is_verified=True, # OAuth emails are verified
            verification_token=None
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif not user.is_active:
        raise HTTPException(status_code=403, detail="Account is banned")
        
    access_token = AuthService.create_access_token(data={"sub": user.email, "tier": user.subscription_tier})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    query = await db.execute(select(User).where(User.email == form_data.username))
    user = query.scalars().first()
    
    if not user or not AuthService.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email is not verified",
        )
        
    access_token = AuthService.create_access_token(data={"sub": user.email, "tier": user.subscription_tier})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
