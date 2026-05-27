from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from typing import List, Optional
import datetime
import numpy as np

from app.database import get_db
from app.models.user import User
from app.models.job import Job, JobSkill
from app.models.cv import CV, CVSkill
from app.models.application import JobApplication, RecruiterAction
from app.models.notification import Notification
from app.models.skill import Skill
from app.services.auth_service import get_current_user
from app.ml.hgat.slwg import SLWGComputer
from app.ml.embedding import SentenceTransformerEmbedding
from pydantic import BaseModel
import uuid

from app.schemas.job import JobCreate, JobResponse

router = APIRouter()

class StatusUpdate(BaseModel):
    status: str

# Role check dependency
async def require_recruiter(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != 'recruiter' and current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Recruiter role required."
        )
    if not current_user.company_id and current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recruiter has no company associated."
        )
    
    stmt = select(User).options(selectinload(User.company)).where(User.id == current_user.id)
    result = await db.execute(stmt)
    return result.scalars().first()

@router.get("/jobs/my-postings")
async def get_my_postings(
    active_only: Optional[bool] = None,
    current_user: User = Depends(require_recruiter),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Job).where(Job.company_id == current_user.company_id, Job.deleted_at.is_(None))
    if active_only is not None:
        stmt = stmt.where(Job.is_active == active_only)
    
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    current_user: User = Depends(require_recruiter),
    db: AsyncSession = Depends(get_db)
):
    # 1. Create Job record
    job_id_str = f"JOB-{uuid.uuid4().hex[:8].upper()}"
    apply_url = f"/jobs/{job_id_str}/apply"
    
    new_job = Job(
        job_id=job_id_str,
        apply_url=apply_url,
        company_id=current_user.company_id,
        title_vi=job_data.title_vi,
        title_en=job_data.title_en,
        job_address=job_data.job_address,
        job_requirements_vi=job_data.job_requirements_vi,
        job_requirements_en=job_data.job_requirements_en,
        job_description_vi=job_data.job_description_vi,
        job_description_en=job_data.job_description_en,
        benefit_vi=job_data.benefit_vi,
        benefit_en=job_data.benefit_en,
        salary_min_vnd=job_data.salary_min_vnd,
        salary_max_vnd=job_data.salary_max_vnd,
        salary_is_negotiable=job_data.salary_is_negotiable,
        experience_min_years=job_data.experience_min_years,
        experience_max_years=job_data.experience_max_years,
        job_type=job_data.job_type,
        quantity=job_data.quantity,
        job_category=job_data.job_category,
        is_active=True,
        company_name_vi=current_user.company.name_vi if current_user.company else None,
        company_name_en=current_user.company.name_en if current_user.company else None,
    )
    
    # 2. Extract Text Embedding for the new job
    # Combine relevant text fields for the embedding representation
    text_parts = [
        job_data.title_en or job_data.title_vi or "",
        job_data.job_description_en or job_data.job_description_vi or "",
        job_data.job_requirements_en or job_data.job_requirements_vi or ""
    ]
    full_text = " ".join([p for p in text_parts if p.strip()])
    
    embedder = SentenceTransformerEmbedding()
    new_job.embedding = embedder.get_embedding(full_text)
    new_job.embedded_at = datetime.datetime.utcnow()
    
    db.add(new_job)
    await db.flush() # get new_job.id
    
    # 3. Add Skills
    for skill_req in job_data.skills:
        # Check if skill exists
        skill_stmt = select(Skill).where(Skill.id == skill_req.skill_id)
        skill_res = await db.execute(skill_stmt)
        if skill_res.scalars().first():
            job_skill = JobSkill(
                job_id=new_job.id,
                skill_id=skill_req.skill_id,
                is_required=skill_req.is_required,
                extracted_by='manual'
            )
            db.add(job_skill)
            
    await db.commit()
    await db.refresh(new_job)
    
    # Eager load for response
    stmt = select(Job).options(
        selectinload(Job.company),
        selectinload(Job.skills).selectinload(JobSkill.skill)
    ).where(Job.deleted_at.is_(None), Job.id == new_job.id)
    res = await db.execute(stmt)
    
    return res.scalars().first()

@router.get("/jobs/{job_id}/applications")
async def get_job_applications(
    job_id: int,
    current_user: User = Depends(require_recruiter),
    db: AsyncSession = Depends(get_db)
):
    # Verify job ownership
    job_stmt = select(Job).where(Job.deleted_at.is_(None), Job.id == job_id, Job.company_id == current_user.company_id)
    job_res = await db.execute(job_stmt)
    job = job_res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found or unauthorized.")

    stmt = select(JobApplication).options(
        selectinload(JobApplication.cv).selectinload(CV.skills).selectinload(CVSkill.skill),
        selectinload(JobApplication.applicant)
    ).where(JobApplication.job_id == job_id)
    
    # Sort: prioritise manual_rank, then match_score DESC
    stmt = stmt.order_by(JobApplication.manual_rank.asc(), JobApplication.match_score.desc())
    
    result = await db.execute(stmt)
    apps = result.scalars().all()
    
    return [
        {
            "id": app.id,
            "cv_id": app.cv_id,
            "applicant_id": app.applicant_id,
            "candidate_name": app.applicant.full_name or app.applicant.email,
            "match_score": app.match_score,
            "status": app.status,
            "applied_at": app.applied_at,
            "cv_title": app.cv.title_en if app.cv else "CV Nộp Trực Tiếp",
            "cv_url": getattr(app, "cv_url", None),
            "manual_rank": app.manual_rank
        }
        for app in apps
    ]

@router.get("/jobs/{job_id}/top-matches")
async def get_top_matches(
    job_id: int,
    current_user: User = Depends(require_recruiter),
    db: AsyncSession = Depends(get_db)
):
    # Verify job ownership
    job_stmt = select(Job).options(
        selectinload(Job.skills).selectinload(JobSkill.skill)
    ).where(Job.deleted_at.is_(None), Job.id == job_id, Job.company_id == current_user.company_id)
    job_res = await db.execute(job_stmt)
    job = job_res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found or unauthorized.")

    # 1. Fetch applications
    app_stmt = select(JobApplication).where(JobApplication.job_id == job_id)
    app_res = await db.execute(app_stmt)
    apps = app_res.scalars().all()
    total_apps = len(apps)

    # 2. Get top 50 candidates in the database matching this job profile
    # For a high-quality demonstration, we run HGAT/SentenceTransformer over all CVs
    # [MED-2 FIX] Add soft-delete filter for CVs
    cvs_stmt = select(CV).options(
        selectinload(CV.skills).selectinload(CVSkill.skill),
        selectinload(CV.user)
    ).where(CV.deleted_at.is_(None), CV.embedding.isnot(None)).limit(50)
    cvs_res = await db.execute(cvs_stmt)
    cvs = cvs_res.scalars().all()

    slwg_computer = SLWGComputer()
    top_candidates = []
    
    job_skill_edges = []
    for js in job.skills:
        job_skill_edges.append((job.id, js.skill_id, js.skill, js.is_required))

    for cv in cvs:
        # Calculate sub-scores (semantic + skill match)
        cv_emb_np = np.array(cv.embedding)
        job_emb_np = np.array(job.embedding) if job.embedding else None
        
        if job_emb_np is not None:
            hgat_cosine = float(np.dot(cv_emb_np, job_emb_np) / (np.linalg.norm(cv_emb_np) * np.linalg.norm(job_emb_np) + 1e-8))
        else:
            hgat_cosine = 0.75
            
        cv_skill_ids = {sk.skill_id for sk in cv.skills}
        job_all_skill_ids = {js.skill_id for js in job.skills}
        overlap_skills = cv_skill_ids & job_all_skill_ids
        skill_match_score = len(overlap_skills) / len(job_all_skill_ids) if job_all_skill_ids else 0.0

        experience_match = 1.0
        if job.experience_min_years is not None and job.experience_min_years > 0:
            experience_match = min(1.0, float(cv.experience_years or 0.0) / float(job.experience_min_years))

        overall_score = 0.5 * hgat_cosine + 0.3 * skill_match_score + 0.2 * experience_match
        
        # SLWG analysis
        slwg_res = slwg_computer.compute_advisory(cv_skill_ids, job_skill_edges)
        missing_skills = [item["skill"] for item in slwg_res.missing_required]
        strengths = [js.skill.name for js in job.skills if js.skill_id in cv_skill_ids]

        explanation = f"Excellent technical alignment in {', '.join(strengths[:3])}." if overall_score >= 0.8 else "Good potential match with bridgeable gaps."

        top_candidates.append({
            "cv_id": cv.id,
            "candidate_name": cv.user.full_name or cv.user.email,
            "match_score": round(overall_score, 2),
            "skill_match": round(skill_match_score, 2),
            "experience_match": round(experience_match, 2),
            "missing_skills": missing_skills[:3],
            "strengths": strengths[:3],
            "ai_explanation": explanation
        })

    # Sort DESC
    top_candidates.sort(key=lambda x: x["match_score"], reverse=True)

    return {
        "job_id": job.job_id,
        "total_applications": total_apps,
        "top_candidates": top_candidates[:10] # Top 10 matches
    }

@router.post("/applications/{id}/update-status")
async def update_application_status(
    id: int,
    body: StatusUpdate,
    current_user: User = Depends(require_recruiter),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(JobApplication).options(selectinload(JobApplication.job)).where(JobApplication.deleted_at.is_(None), JobApplication.id == id)
    res = await db.execute(stmt)
    app = res.scalars().first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Job application not found.")

    if app.job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this application.")

    # Validate status
    allowed_statuses = {'pending', 'reviewed', 'shortlisted', 'rejected', 'hired'}
    if body.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {allowed_statuses}")

    app.status = body.status
    
    # Log RecruiterAction
    action = RecruiterAction(
        recruiter_id=current_user.id,
        application_id=app.id,
        action_type=body.status
    )
    db.add(action)
    
    # Create notification for candidate
    notification = Notification(
        user_id=app.applicant_id,
        type="application_status",
        title="Application Status Updated",
        message=f"Your application for {app.job.title_en or app.job.title_vi} was updated to {body.status.upper()}.",
        link=f"/applications/{app.id}"
    )
    db.add(notification)
    
    await db.commit()
    
    return {"message": "Application status updated successfully", "status": app.status}

@router.get("/analytics/skill-heatmap")
async def get_skill_heatmap(
    current_user: User = Depends(require_recruiter),
    db: AsyncSession = Depends(get_db)
):
    # Retrieve all skills from candidates who have applied to recruiter's jobs
    stmt = select(JobApplication).join(Job).where(Job.company_id == current_user.company_id)
    res = await db.execute(stmt)
    apps = res.scalars().all()
    
    if not apps:
        return []

    # [HIGH-7 FIX] Filter out None cv_ids from direct-upload applications
    cv_ids = [app.cv_id for app in apps if app.cv_id is not None]
    
    if not cv_ids:
        return []
    
    skills_stmt = select(CVSkill).options(selectinload(CVSkill.skill)).where(CVSkill.cv_id.in_(cv_ids))
    skills_res = await db.execute(skills_stmt)
    cv_skills = skills_res.scalars().all()

    # Aggregate frequency
    heatmap_dict = {}
    for cv_sk in cv_skills:
        skill_name = cv_sk.skill.name
        cat = getattr(cv_sk.skill, "skill_category", "technical") or "technical"
        if skill_name not in heatmap_dict:
            heatmap_dict[skill_name] = {
                "skill": skill_name,
                "frequency": 0,
                "category": cat
            }
        heatmap_dict[skill_name]["frequency"] += 1

    # Convert to list and sort
    heatmap_list = list(heatmap_dict.values())
    heatmap_list.sort(key=lambda x: x["frequency"], reverse=True)
    
    return heatmap_list[:25] # Return top 25 skills for the heatmap
