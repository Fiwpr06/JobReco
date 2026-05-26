from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from pydantic import BaseModel

from app.models.user import User
from app.models.job import Job
from app.models.cv import CV
from app.services.auth_service import require_admin, get_db

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    users_count = await db.scalar(select(func.count(User.id)))
    jobs_count = await db.scalar(select(func.count(Job.id)).where(Job.deleted_at.is_(None)))
    cvs_count = await db.scalar(select(func.count(CV.id)).where(CV.deleted_at.is_(None)))
    
    return {
        "total_users": users_count,
        "total_jobs": jobs_count,
        "total_cvs": cvs_count
    }

class StatusUpdate(BaseModel):
    is_active: bool

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    status_update: StatusUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.role == 'admin':
        raise HTTPException(status_code=400, detail="Cannot change status of another admin")
        
    user.is_active = status_update.is_active
    await db.commit()
    
    status_str = "activated" if user.is_active else "deactivated"
    return {"message": f"User {user_id} has been {status_str}"}

@router.put("/jobs/{job_id}/status")
async def update_job_status(
    job_id: int,
    status_update: StatusUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job.is_active = status_update.is_active
    await db.commit()
    
    status_str = "activated" if job.is_active else "deactivated"
    return {"message": f"Job {job_id} has been {status_str}"}
