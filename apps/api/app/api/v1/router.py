from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.cvs import router as cvs_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.matching import router as matching_router
from app.api.v1.skills import router as skills_router
from app.api.v1.health import router as health_router
from app.api.v1.recruiter import router as recruiter_router
from app.api.v1.payments import router as payments_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.admin import router as admin_router
from app.api.v1.chat import router as chat_router

router = APIRouter()

# Register routes with prefixes and tags
router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
router.include_router(cvs_router, prefix="/cvs", tags=["CV Management"])
router.include_router(jobs_router, prefix="/jobs", tags=["Job Postings"])
router.include_router(matching_router, prefix="/matching", tags=["AI Graph Matching"])
router.include_router(skills_router, prefix="/skills", tags=["Skills & Market Trends"])
router.include_router(health_router, prefix="/health", tags=["Health & Status"])
router.include_router(recruiter_router, prefix="/recruiter", tags=["Recruiter Workspace"])
router.include_router(payments_router, prefix="/payments", tags=["Payments & Subscription"])
router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
router.include_router(admin_router, prefix="/admin", tags=["Admin Dashboard"])
router.include_router(chat_router, prefix="/chat", tags=["Realtime Chat"])
