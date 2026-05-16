from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Optional
import datetime
import os

from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.job import Job, ApplyClick, JobSkill
from app.models.cv import CV
from app.schemas.job import JobResponse
from app.services.auth_service import get_db, get_current_user
from app.ml.embedding import SentenceTransformerEmbedding
from app.ml.faiss_index import FAISSIndexManager
from app.config import settings

router = APIRouter()

FAISS_INDEX_PATH = os.path.join(os.getcwd(), "faiss_indexes", "index.faiss")

@router.get("", response_model=List[JobResponse])
async def list_jobs(
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
    # Case 1: Semantic search using FAISS
    if query:
        embedder = SentenceTransformerEmbedding()
        query_vector = embedder.get_embedding(query)
        
        if not os.path.exists(FAISS_INDEX_PATH):
            # Fallback to database search if FAISS index is missing
            stmt = select(Job).options(
                selectinload(Job.company),
                selectinload(Job.skills).selectinload(JobSkill.skill)
            ).where(Job.is_active == True)
        else:
            try:
                # [HIGH-1 FIX] Pass dimension=settings.EMBEDDING_DIM consistently
                # (matching.py already does this; jobs.py was calling with no dimension)
                faiss_manager = FAISSIndexManager(dimension=settings.EMBEDDING_DIM)
                faiss_manager.load(FAISS_INDEX_PATH)

                results = faiss_manager.search(query_vector, k=skip + limit)
                
                if not results:
                    return []
                
                # Extract matching IDs
                matched_ids = [db_id for db_id, score in results]
                
                # Fetch records from database
                stmt = select(Job).options(
                    selectinload(Job.company),
                    selectinload(Job.skills).selectinload(JobSkill.skill)
                ).where(Job.id.in_(matched_ids), Job.is_active == True)
                
                db_results = await db.execute(stmt)
                jobs_map = {job.id: job for job in db_results.scalars().all()}
                
                # Maintain FAISS rank order
                ranked_jobs = []
                for db_id, score in results[skip:]:
                    if db_id in jobs_map:
                        ranked_jobs.append(jobs_map[db_id])
                    if len(ranked_jobs) >= limit:
                        break
                return ranked_jobs
            except Exception as e:
                # Fallback to DB query if FAISS load/search fails
                stmt = select(Job).options(
                    selectinload(Job.company),
                    selectinload(Job.skills).selectinload(JobSkill.skill)
                ).where(Job.is_active == True)
    else:
        # Case 2: Standard database query
        stmt = select(Job).options(
            selectinload(Job.company),
            selectinload(Job.skills).selectinload(JobSkill.skill)
        ).where(Job.is_active == True)
        
    # Apply database-level filters if present
    if category:
        stmt = stmt.where(Job.job_category.ilike(f"%{category}%"))
    if location:
        stmt = stmt.where(
            (Job.job_address.ilike(f"%{location}%")) | 
            (Job.job_address_detail.ilike(f"%{location}%"))
        )
    if min_experience is not None:
        stmt = stmt.where(Job.experience_min_years <= min_experience)
    if min_salary is not None:
        stmt = stmt.where(
            (Job.salary_max_vnd >= min_salary) | 
            (Job.salary_is_negotiable == True)
        )
    if job_type:
        from sqlalchemy import or_
        types = [t.strip().lower() for t in job_type.split(',')]
        conditions = [Job.job_type.ilike(f"%{t}%") for t in types]
        stmt = stmt.where(or_(*conditions))
        
    stmt = stmt.order_by(Job.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_detail(
    job_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Job).options(
        selectinload(Job.company),
        selectinload(Job.skills).selectinload(JobSkill.skill)
    ).where(Job.id == job_id)
    
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
    stmt = select(Job).where(Job.id == job_id)
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
        clicked_at=datetime.datetime.utcnow()
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
    stmt = select(Job).where(Job.id == job_id)
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
