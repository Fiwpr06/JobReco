from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import uuid
import datetime
from datetime import timezone as tz

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

@router.post("/notify-transfer/{order_code}")
async def notify_transfer(
    order_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Candidate calls this when they have transferred the money.
    Changes status to 'processing' (pending manual confirmation).
    """
    result = await db.execute(
        select(PaymentTransaction).where(
            PaymentTransaction.order_code == order_code,
            PaymentTransaction.user_id == current_user.id
        )
    )
    tx = result.scalars().first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if tx.status != "pending":
        return {"message": f"Transaction already marked as {tx.status}"}
        
    tx.status = "processing"
    await db.commit()
    
    return {"message": "Notification received, awaiting admin confirmation", "status": tx.status}

@router.post("/admin/confirm/{order_code}")
async def admin_confirm_payment(
    order_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin manually confirms the payment and activates premium for the user.
    """
    # Verify Admin Role
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.order_code == order_code)
    )
    tx = result.scalars().first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if tx.status == "completed":
        return {"message": "Transaction already completed"}
        
    # Mark as completed
    tx.status = "completed"
    
    # Upgrade User
    user_result = await db.execute(select(User).where(User.id == tx.user_id))
    user = user_result.scalars().first()
    
    if user:
        user.subscription_tier = "premium"
        current_time = datetime.datetime.now(tz.utc)
        if user.premium_until and user.premium_until > current_time:
            user.premium_until = user.premium_until + datetime.timedelta(days=30)
        else:
            user.premium_until = current_time + datetime.timedelta(days=30)
            
    await db.commit()
    return {"message": "Payment confirmed and user upgraded"}

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
