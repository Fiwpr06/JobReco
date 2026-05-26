from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import uuid
import datetime

from app.database import get_db
from app.models.user import User
from app.models.payment import PaymentTransaction
from app.services.auth_service import get_current_user
from pydantic import BaseModel

router = APIRouter()

# ---- SCHEMAS ----

class PaymentCreateRequest(BaseModel):
    package_name: str
    amount: int

class PaymentTransactionResponse(BaseModel):
    id: int
    package_name: str
    amount: int
    order_code: str
    status: str
    created_at: datetime.datetime
    
    class Config:
        from_attributes = True

class WebhookPayload(BaseModel):
    order_code: str
    amount: int
    status: str # expected "completed"

# ---- ENDPOINTS ----

@router.post("/create-qr")
async def create_qr(
    req: PaymentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.config import settings
    # Generate unique order code (e.g., UPGRADE + random 6 digits)
    order_code = f"UPGRADE{uuid.uuid4().hex[:6].upper()}"
    
    # Create transaction
    tx = PaymentTransaction(
        user_id=current_user.id,
        amount=req.amount,
        package_name=req.package_name,
        order_code=order_code,
        status="pending"
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    
    # Generate VietQR URL
    bank_id = settings.BANK_ID
    account_no = settings.BANK_ACCOUNT_NO 
    account_name = settings.BANK_ACCOUNT_NAME
    qr_url = f"https://img.vietqr.io/image/{bank_id}-{account_no}-compact2.png?amount={tx.amount}&addInfo={tx.order_code}&accountName={account_name}"
    
    return {
        "order_code": tx.order_code,
        "amount": tx.amount,
        "qr_url": qr_url,
        "status": tx.status
    }

@router.get("/status/{order_code}")
async def get_payment_status(
    order_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PaymentTransaction).where(
            PaymentTransaction.order_code == order_code,
            PaymentTransaction.user_id == current_user.id
        )
    )
    tx = result.scalars().first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    return {
        "order_code": tx.order_code,
        "status": tx.status
    }

from fastapi import Request
import hmac
import hashlib
from app.utils.rate_limit import limiter

@router.post("/webhook")
@limiter.limit("20/minute")
async def payment_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook endpoint to be called by payment gateway.
    """
    from app.config import settings
    import json
    
    body = await request.body()
    
    # Signature verification
    signature = request.headers.get("X-Webhook-Signature")
    if settings.NODE_ENV == "production":
        if not signature:
            raise HTTPException(status_code=401, detail="Missing signature")
            
        expected_signature = hmac.new(
            settings.PAYMENT_WEBHOOK_SECRET.encode('utf-8'),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_signature):
            raise HTTPException(status_code=401, detail="Invalid signature")

    payload_data = json.loads(body)
    payload = WebhookPayload(**payload_data)

    if payload.status != "completed":
        return {"message": "Ignored"}
        
    # Find transaction
    result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.order_code == payload.order_code)
    )
    tx = result.scalars().first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if tx.status == "completed":
        return {"message": "Already processed"}
        
    if tx.amount != payload.amount:
        raise HTTPException(status_code=400, detail="Amount mismatch")
        
    # Update transaction
    tx.status = "completed"
    
    # Upgrade user
    user_result = await db.execute(select(User).where(User.id == tx.user_id))
    user = user_result.scalars().first()
    
    if user:
        user.subscription_tier = "premium"
        # Add 30 days to premium_until
        current_time = datetime.datetime.utcnow()
        if user.premium_until and user.premium_until > current_time:
            user.premium_until = user.premium_until + datetime.timedelta(days=30)
        else:
            user.premium_until = current_time + datetime.timedelta(days=30)
            
    await db.commit()
    return {"message": "Success"}

@router.get("/history", response_model=List[PaymentTransactionResponse])
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PaymentTransaction)
        .where(PaymentTransaction.user_id == current_user.id)
        .order_by(PaymentTransaction.created_at.desc())
    )
    return result.scalars().all()
