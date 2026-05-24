from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.services.auth_service import get_current_user

def require_tier(allowed_tiers: list[str]):
    async def dependency(user: User = Depends(get_current_user)):
        if user.subscription_tier not in allowed_tiers:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Feature requires upgrade. Allowed tiers: {', '.join(allowed_tiers)}"
            )
        return user
    return dependency
