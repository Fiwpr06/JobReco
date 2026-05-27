from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Optional
import datetime
from datetime import timezone as tz
import os
import uuid
from app.utils.cloudinary import upload_pdf_to_cloudinary


from app.models.user import User
from app.models.job import Job, ApplyClick, JobSkill
from app.models.application import JobApplication
from app.models.cv import CV
from app.schemas.job import JobResponse
from app.services.auth_service import get_db, get_current_user
from app.ml.embedding import SentenceTransformerEmbedding
from app.ml.faiss_index import FAISSIndexManager, get_faiss_manager
from app.config import settings

router = APIRouter()

FAISS_INDEX_PATH = os.path.join(os.getcwd(), "faiss_indexes", "index.faiss")

@router.get("", response_model=List[JobResponse])
async def list_jobs(
    response: Response,
    query: Optional[str] = Query(None, description="Semantic search query using sentence embeddings"),
    category: Optional[str] = Query(None, description="Filter by job category"),
    location: Optional[str] = Query(None, description="Filter by location/address keyword"),
    min_experience: Optional[float] = Query(None, description="Filter by maximum required years of experience"),
    min_salary: Optional[int] = Query(None, description="Filter by minimum salary (VND)"),
    job_type: Optional[str] = Query(None, description="Filter by job type (comma-separated for multiple types)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    total_count = 0
    # Case 1: Semantic search using FAISS
    if query:
        try:
            embedder = SentenceTransformerEmbedding()
            query_vector = embedder.get_embedding(query)
            faiss_manager = get_faiss_manager(dimension=settings.EMBEDDING_DIM)
            if faiss_manager.total_vectors > 0:
                results = faiss_manager.search(query_vector, k=50)
                
                if not results:
                    response.headers["X-Total-Count"] = "0"
                    return []
                
                total_count = len(results)
                
                # Extract matching IDs
                matched_ids = [db_id for db_id, score in results]
                
                # Fetch records from database
                stmt = select(Job).options(
                    selectinload(Job.company),
                    selectinload(Job.skills).selectinload(JobSkill.skill)
                ).where(Job.id.in_(matched_ids), Job.deleted_at.is_(None), Job.is_active == True)
                
                db_results = await db.execute(stmt)
                jobs_map = {job.id: job for job in db_results.scalars().all()}
                
                # Maintain FAISS rank order
                ranked_jobs = []
                for db_id, score in results[skip:]:
                    if db_id in jobs_map:
                        ranked_jobs.append(jobs_map[db_id])
                    if len(ranked_jobs) >= limit:
                        break
                
                response.headers["X-Total-Count"] = str(total_count)
                return ranked_jobs
            else:
                # Fallback to DB query if FAISS is empty
                stmt = select(Job).options(
                    selectinload(Job.company),
                    selectinload(Job.skills).selectinload(JobSkill.skill)
                ).where(Job.deleted_at.is_(None), Job.is_active == True)
        except Exception as e:
            # Fallback to DB query if FAISS load/search fails
            stmt = select(Job).options(
                selectinload(Job.company),
                selectinload(Job.skills).selectinload(JobSkill.skill)
            ).where(Job.deleted_at.is_(None), Job.is_active == True)
    else:
        # Case 2: Standard database query
        stmt = select(Job).options(
            selectinload(Job.company),
            selectinload(Job.skills).selectinload(JobSkill.skill)
        ).where(Job.deleted_at.is_(None), Job.is_active == True)
        
    # [CRIT-1 FIX] Escape SQL wildcards in user-supplied filter values
    def _escape_like(val: str) -> str:
        return val.replace("%", "\\%").replace("_", "\\_")

    # Apply database-level filters if present
    count_stmt = select(func.count(Job.id)).where(Job.deleted_at.is_(None), Job.is_active == True)
    
    if category:
        safe_cat = _escape_like(category)
        stmt = stmt.where(Job.job_category.ilike(f"%{safe_cat}%"))
        count_stmt = count_stmt.where(Job.job_category.ilike(f"%{safe_cat}%"))
    if location:
        safe_loc = _escape_like(location)
        loc_cond = (Job.job_address.ilike(f"%{safe_loc}%")) | (Job.job_address_detail.ilike(f"%{safe_loc}%"))
        stmt = stmt.where(loc_cond)
        count_stmt = count_stmt.where(loc_cond)
    if min_experience is not None:
        stmt = stmt.where(Job.experience_min_years <= min_experience)
        count_stmt = count_stmt.where(Job.experience_min_years <= min_experience)
    if min_salary is not None:
        sal_cond = (Job.salary_max_vnd >= min_salary) | (Job.salary_is_negotiable == True)
        stmt = stmt.where(sal_cond)
        count_stmt = count_stmt.where(sal_cond)
    if job_type:
        from sqlalchemy import or_
        types = [t.strip().lower() for t in job_type.split(',')]
        conditions = [Job.job_type.ilike(f"%{t}%") for t in types]
        stmt = stmt.where(or_(*conditions))
        count_stmt = count_stmt.where(or_(*conditions))
        
    # Get total count
    total_result = await db.execute(count_stmt)
    total_count = total_result.scalar() or 0
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"
        
    stmt = stmt.order_by(Job.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/applications/me")
async def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all job applications for the current user.
    """
    stmt = select(JobApplication).options(
        selectinload(JobApplication.job).selectinload(Job.company),
        selectinload(JobApplication.cv)
    ).where(JobApplication.deleted_at.is_(None), JobApplication.applicant_id == current_user.id).order_by(JobApplication.applied_at.desc())
    
    result = await db.execute(stmt)
    apps = result.scalars().all()
    
    return [
        {
            "id": app.id,
            "job_id": app.job_id,
            "job_title": app.job.title_vi or app.job.title_en,
            "company_name": app.job.company.name_vi if app.job.company else app.job.company_name_vi,
            "status": app.status,
            "applied_at": app.applied_at,
            "apply_url": app.job.apply_url,
            "cv_title": app.cv.title_en if app.cv else None,
            "cv_url": getattr(app, "cv_url", None),
            # [HIGH-2 FIX] Guard against None apply_url to prevent AttributeError
            "source": "self-posted" if not (app.job.apply_url or "").startswith("http") or "example.com" in (app.job.apply_url or "") else "crawled"
        }
        for app in apps
    ]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_detail(
    job_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Job).options(
        selectinload(Job.company),
        selectinload(Job.skills).selectinload(JobSkill.skill)
    ).where(Job.deleted_at.is_(None), Job.id == job_id)
    
    result = await db.execute(stmt)
    job = result.scalars().first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found."
        )
    return job


@router.get("/{job_id}/apply")
async def track_apply_click_and_redirect(
    job_id: int,
    cv_id: Optional[int] = Query(None, description="Optional CV ID associated with application click"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch job to verify existance and get apply_url
    stmt = select(Job).where(Job.deleted_at.is_(None), Job.id == job_id)
    result = await db.execute(stmt)
    job = result.scalars().first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found."
        )
        
    # Log ApplyClick trace
    click_log = ApplyClick(
        user_id=current_user.id,
        job_id=job.id,
        cv_id=cv_id,
        apply_url=job.apply_url,
        clicked_at=datetime.datetime.now(tz.utc)
    )
    
    db.add(click_log)
    await db.commit()
    
    # Securely redirect user to target company application endpoint
    return RedirectResponse(url=job.apply_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

@router.post("/{job_id}/apply-click", response_model=dict)
async def post_track_apply_click(
    job_id: int,
    cv_id: Optional[int] = Query(None, description="Optional CV ID associated with application click"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Log application click and return apply_url (API variant).
    """
    stmt = select(Job).where(Job.deleted_at.is_(None), Job.id == job_id)
    result = await db.execute(stmt)
    job = result.scalars().first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found."
        )
        
    click_log = ApplyClick(
        user_id=current_user.id,
        job_id=job.id,
        cv_id=cv_id,
        apply_url=job.apply_url,
        clicked_at=datetime.datetime.utcnow()
    )
    
    db.add(click_log)
    await db.commit()
    
    return {"apply_url": job.apply_url, "tracked": True}


@router.post("/{job_id}/apply-direct", response_model=dict)
async def post_apply_direct(
    job_id: int,
    cv_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Apply directly to a system job by uploading a PDF CV.
    Uploads to Cloudinary, parses basic info, and creates JobApplication.
    """
    stmt = select(Job).where(Job.deleted_at.is_(None), Job.id == job_id)
    result = await db.execute(stmt)
    job = result.scalars().first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found."
        )
        
    # Check upload quota for free users
    if current_user.subscription_tier == "free":
        now = datetime.datetime.now(tz.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        count_query = await db.execute(
            select(func.count(JobApplication.id))
            .where(JobApplication.deleted_at.is_(None), JobApplication.applicant_id == current_user.id, JobApplication.applied_at >= start_of_month)
        )
        app_count = count_query.scalar()
        if app_count >= 10:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Free tier limit reached: You can only apply to 10 jobs per month. Please upgrade to Premium."
            )

    # Save file temporarily
    upload_dir = os.path.join(os.getcwd(), "data", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(cv_file.filename)[1]
    filepath = os.path.join(upload_dir, f"{file_id}{ext}")
    
    try:
        with open(filepath, "wb") as f:
            content = await cv_file.read()
            f.write(content)
            
        # Upload to Cloudinary
        cloud_result = upload_pdf_to_cloudinary(filepath)
        if not cloud_result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload CV to Cloudinary."
            )
    finally:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass
        
    # Create JobApplication with cv_url
    app_record = JobApplication(
        job_id=job.id,
        applicant_id=current_user.id,
        cv_id=None, # Direct upload, we can skip creating a full CV record for now, or just leave it null
        cv_url=cloud_result["url"],
        cv_public_id=cloud_result["public_id"],
        status="pending",
        applied_at=datetime.datetime.now(tz.utc)
    )
    
    db.add(app_record)
    await db.commit()
    
    # Optionally, we can enqueue a celery task to parse this CV and compute HGAT score asynchronously
    # task = analyze_application_cv_task.delay(app_record.id, filepath)
    
    return {
        "status": "success",
        "message": "Successfully applied to job.",
        "application_id": app_record.id,
        "cv_url": cloud_result["url"]
    }


