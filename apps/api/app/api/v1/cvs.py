from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import os
import uuid
import logging

logger = logging.getLogger(__name__)
from celery.result import AsyncResult
from app.tasks.analyze_task import analyze_cv_task
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List
import datetime

from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.cv import CV, CVSkill
from app.models.skill import Skill
from app.schemas.cv import CVCreate, CVUpdate, CVResponse
from app.services.auth_service import get_db, get_current_user
from app.pipelines.translator import TranslationService
from app.pipelines.normalizer import ExperienceNormalizer, SalaryNormalizer
from app.pipelines.skill_extractor import HybridSkillExtractor
from app.ml.embedding import SentenceTransformerEmbedding

router = APIRouter()

@router.post("/analyze")
async def analyze_cv(
    cv_in: CVCreate,
    db: AsyncSession = Depends(get_db)
):
    # 1. Translate raw text if VI provided but EN is missing
    raw_vi = cv_in.raw_text_vi or ""
    raw_en = cv_in.raw_text_en or ""
    
    if raw_vi and not raw_en:
        translator = TranslationService()
        raw_en = translator.translate_vi_to_en(raw_vi)
        
    # 2. Extract skills from raw text
    extractor = HybridSkillExtractor(db_session=db)
    skills_vi = await extractor.extract_skills(raw_vi) if raw_vi else []
    skills_en = await extractor.extract_skills(raw_en) if raw_en else []
    
    # Merge skills by ID
    extracted_skills = {s.id: s for s in (skills_vi + skills_en)}
    
    # 3. Normalize Experience and Salary if not provided
    experience_years = cv_in.experience_years
    if (experience_years is None or experience_years == 0.0) and raw_vi:
        min_exp, max_exp = ExperienceNormalizer.normalize(raw_vi)
        experience_years = min_exp if min_exp > 0 else max_exp
        
    # Format skills for response
    formatted_skills = []
    for s_id, s in extracted_skills.items():
        formatted_skills.append({
            "id": 0,
            "cv_id": 0,
            "skill_id": s.id,
            "proficiency_level": "intermediate",
            "years_experience": 1.0,
            "skill": {
                "id": s.id,
                "name": s.name,
                "name_vi": s.name_vi,
                "category": getattr(s, "skill_category", None),
            }
        })
        
    title_en = cv_in.title_en
    if not title_en:
        if raw_en:
            first_line = raw_en.split("\n")[0].strip()
            title_en = first_line[:100] if len(first_line) > 5 else "Resume Profile"
        else:
            title_en = "Resume Profile"
            
    summary_en = cv_in.summary_en
    if not summary_en:
        summary_en = raw_en[:500] if raw_en else "Structured Profile Summary"

    return {
        "id": 0,
        "title_en": title_en,
        "summary_en": summary_en,
        "experience_years": experience_years or 0.0,
        "skills": formatted_skills
    }

@router.post("", response_model=CVResponse, status_code=status.HTTP_201_CREATED)
async def create_cv(
    cv_in: CVCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check upload quota for free users
    if current_user.subscription_tier == "free":
        now = datetime.datetime.utcnow()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        count_query = await db.execute(
            select(func.count(CV.id))
            .where(CV.deleted_at.is_(None), CV.user_id == current_user.id, CV.created_at >= start_of_month)
        )
        cv_count = count_query.scalar()
        if cv_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Free tier limit reached: You can only upload 3 CVs per month. Please upgrade to Premium."
            )

    # 1. Translate raw text if VI provided but EN is missing
    raw_vi = cv_in.raw_text_vi or ""
    raw_en = cv_in.raw_text_en or ""
    
    if raw_vi and not raw_en:
        translator = TranslationService()
        raw_en = translator.translate_vi_to_en(raw_vi)
        
    # 2. Extract skills from raw text
    extractor = HybridSkillExtractor(db_session=db)
    skills_vi = await extractor.extract_skills(raw_vi) if raw_vi else []
    skills_en = await extractor.extract_skills(raw_en) if raw_en else []
    
    # Merge skills by ID
    extracted_skills = {s.id: s for s in (skills_vi + skills_en)}
    
    # 3. Normalize Experience and Salary if not provided
    experience_years = cv_in.experience_years
    if (experience_years is None or experience_years == 0.0) and raw_vi:
        min_exp, max_exp = ExperienceNormalizer.normalize(raw_vi)
        experience_years = min_exp if min_exp > 0 else max_exp
        
    expected_salary_min = cv_in.expected_salary_min_vnd
    expected_salary_max = cv_in.expected_salary_max_vnd
    
    if (expected_salary_min is None and expected_salary_max is None) and raw_vi:
        min_v, max_v, _, _, _, _ = SalaryNormalizer.normalize(raw_vi)
        expected_salary_min = min_v
        expected_salary_max = max_v
        
    # Ensure title and summary exist
    title_en = cv_in.title_en
    if not title_en:
        if raw_en:
            first_line = raw_en.split("\n")[0].strip()
            title_en = first_line[:100] if len(first_line) > 5 else "Resume Profile"
        else:
            title_en = "Resume Profile"
            
    summary_en = cv_in.summary_en
    if not summary_en:
        summary_en = raw_en[:500] if raw_en else "Structured Profile Summary"

    # 4. Generate Embedding for FAISS searching
    # We combine title, summary and skills names to get a rich representation
    skill_names = " ".join([s.name for s in extracted_skills.values()])
    embedding_text = f"{title_en}. {summary_en}. Skills: {skill_names}"
    
    embedder = SentenceTransformerEmbedding()
    embedding_vec = embedder.get_embedding(embedding_text)
    
    # 5. Check if this is the first CV for user
    existing_cvs_query = await db.execute(select(CV).where(CV.deleted_at.is_(None), CV.user_id == current_user.id))
    has_existing = len(existing_cvs_query.scalars().all()) > 0
    is_primary = not has_existing # First CV is automatically primary
    
    # 6. Create CV record
    db_cv = CV(
        user_id=current_user.id,
        title_en=title_en,
        summary_en=summary_en,
        experience_years=experience_years or 0.0,
        current_salary_vnd=cv_in.current_salary_vnd,
        expected_salary_min_vnd=expected_salary_min,
        expected_salary_max_vnd=expected_salary_max,
        preferred_locations=cv_in.preferred_locations or [],
        preferred_job_types=cv_in.preferred_job_types or [],
        raw_text_vi=raw_vi,
        raw_text_en=raw_en,
        embedding=embedding_vec,
        is_primary=is_primary
    )
    
    db.add(db_cv)
    await db.commit()
    await db.refresh(db_cv)
    
    # 7. Add CVSkill relationships
    # We combine explicit input skills with auto-extracted skills
    skill_mappings = {} # skill_id -> CVSkillCreate
    
    # First add auto-extracted skills (as intermediate, 1 yr experience)
    for s_id, s in extracted_skills.items():
        skill_mappings[s_id] = {
            "proficiency_level": "intermediate",
            "years_experience": 1.0
        }
        
    # Then override with explicitly provided skills if any
    if cv_in.skills:
        for sk_in in cv_in.skills:
            skill_mappings[sk_in.skill_id] = {
                "proficiency_level": sk_in.proficiency_level or "intermediate",
                "years_experience": sk_in.years_experience or 1.0
            }
            
    # Save CVSkill mappings to DB
    for s_id, meta in skill_mappings.items():
        db_cv_skill = CVSkill(
            cv_id=db_cv.id,
            skill_id=s_id,
            proficiency_level=meta["proficiency_level"],
            years_experience=meta["years_experience"]
        )
        db.add(db_cv_skill)
        
    await db.commit()
    
    # Reload CV with eager loaded skills for response validation
    result = await db.execute(
        select(CV)
        .options(selectinload(CV.skills).selectinload(CVSkill.skill))
        .where(CV.deleted_at.is_(None), CV.id == db_cv.id)
    )
    return result.scalars().first()


@router.get("", response_model=List[CVResponse])
async def list_cvs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CV)
        .options(selectinload(CV.skills).selectinload(CVSkill.skill))
        .where(CV.deleted_at.is_(None), CV.user_id == current_user.id)
        .order_by(CV.is_primary.desc(), CV.created_at.desc())
    )
    return result.scalars().all()


@router.get("/primary", response_model=CVResponse)
async def get_primary_cv(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CV)
        .options(selectinload(CV.skills).selectinload(CVSkill.skill))
        .where(CV.deleted_at.is_(None), CV.user_id == current_user.id, CV.is_primary == True)
    )
    cv = result.scalars().first()
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Primary CV profile not found. Please upload or set a primary CV."
        )
    return cv


@router.get("/{cv_id}", response_model=CVResponse)
async def get_cv(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CV)
        .options(selectinload(CV.skills).selectinload(CVSkill.skill))
        .where(CV.deleted_at.is_(None), CV.id == cv_id, CV.user_id == current_user.id)
    )
    cv = result.scalars().first()
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CV with ID {cv_id} not found."
        )
    return cv


@router.put("/{cv_id}", response_model=CVResponse)
async def update_cv(
    cv_id: int,
    cv_up: CVUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CV)
        .options(selectinload(CV.skills))
        .where(CV.deleted_at.is_(None), CV.id == cv_id, CV.user_id == current_user.id)
    )
    db_cv = result.scalars().first()
    if not db_cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CV with ID {cv_id} not found."
        )
        
    # Update fields
    update_data = cv_up.model_dump(exclude_unset=True)
    skills_in = update_data.pop("skills", None)
    
    for key, val in update_data.items():
        setattr(db_cv, key, val)
        
    # If skills are updated, replace them
    if skills_in is not None:
        # Delete existing skills
        for existing_skill in db_cv.skills:
            await db.delete(existing_skill)
        db_cv.skills = []
        
        # Add new ones
        for sk_in in skills_in:
            db_cv_skill = CVSkill(
                cv_id=db_cv.id,
                skill_id=sk_in["skill_id"],
                proficiency_level=sk_in.get("proficiency_level", "intermediate"),
                years_experience=sk_in.get("years_experience", 1.0)
            )
            db.add(db_cv_skill)
            
    # Regenerate embedding if details changed
    embedder = SentenceTransformerEmbedding()
    # Fetch skill names
    skill_query = await db.execute(
        select(Skill).join(CVSkill).where(CVSkill.cv_id == db_cv.id)
    )
    skills_list = skill_query.scalars().all()
    skill_names = " ".join([s.name for s in skills_list])
    embedding_text = f"{db_cv.title_en}. {db_cv.summary_en}. Skills: {skill_names}"
    db_cv.embedding = embedder.get_embedding(embedding_text)
    
    await db.commit()
    
    # Reload
    reload_result = await db.execute(
        select(CV)
        .options(selectinload(CV.skills).selectinload(CVSkill.skill))
        .where(CV.deleted_at.is_(None), CV.id == db_cv.id)
    )
    return reload_result.scalars().first()


@router.delete("/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cv(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CV).where(CV.deleted_at.is_(None), CV.id == cv_id, CV.user_id == current_user.id)
    )
    cv = result.scalars().first()
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CV with ID {cv_id} not found."
        )
        
    is_deleted_primary = cv.is_primary
    cv.deleted_at = datetime.datetime.utcnow()
    cv.is_primary = False
    await db.commit()
    
    # If we deleted the primary CV and there are other CVs, set the most recent one as primary
    if is_deleted_primary:
        next_cv_query = await db.execute(
            select(CV)
            .where(CV.deleted_at.is_(None), CV.user_id == current_user.id)
            .order_by(CV.created_at.desc())
        )
        next_cv = next_cv_query.scalars().first()
        if next_cv:
            next_cv.is_primary = True
            await db.commit()
            
    return None


@router.post("/{cv_id}/set-primary", response_model=CVResponse)
async def set_primary_cv(
    cv_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CV).where(CV.deleted_at.is_(None), CV.id == cv_id, CV.user_id == current_user.id)
    )
    cv = result.scalars().first()
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CV with ID {cv_id} not found."
        )
        
    # [CRIT-5 FIX] Removed the dead `select` call that preceded this block.
    # The previous code executed a SELECT without using the result — it did nothing.
    # The loop below correctly marks all CVs as primary/non-primary by id comparison.
    all_cvs_query = await db.execute(
        select(CV).where(CV.deleted_at.is_(None), CV.user_id == current_user.id)
    )
    for other_cv in all_cvs_query.scalars().all():
        other_cv.is_primary = (other_cv.id == cv_id)
        
    await db.commit()
    
    # Reload
    reload_result = await db.execute(
        select(CV)
        .options(selectinload(CV.skills).selectinload(CVSkill.skill))
        .where(CV.deleted_at.is_(None), CV.id == cv_id)
    )
    return reload_result.scalars().first()

@router.post("/upload-and-analyze")
async def upload_and_analyze_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF is allowed."
        )

    content = await file.read()
    if len(content) > 5 * 1024 * 1024: # 5MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 5MB limit."
        )

    # Check upload quota for free users
    if current_user.subscription_tier == "free":
        now = datetime.datetime.utcnow()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        count_query = await db.execute(
            select(func.count(CV.id))
            .where(CV.deleted_at.is_(None), CV.user_id == current_user.id, CV.created_at >= start_of_month)
        )
        cv_count = count_query.scalar()
        if cv_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Free tier limit reached: You can only upload 3 CVs per month. Please upgrade to Premium."
            )

    # Ensure upload directory exists
    upload_dir = os.path.join(os.getcwd(), "data", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file temporarily
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    filepath = os.path.join(upload_dir, f"{file_id}{ext}")
    
    with open(filepath, "wb") as f:
        f.write(content)
        
    # Dispatch Celery Task
    task = analyze_cv_task.delay(filepath)
    
    return {"task_id": task.id, "status": "processing", "message": "CV uploaded and analysis started"}

@router.get("/status/{task_id}")
async def get_analysis_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    task_result = AsyncResult(task_id)
    
    if task_result.state == 'PENDING':
        return {"status": "processing", "progress": 0, "step": "pending"}
    elif task_result.state == 'PROGRESS':
        return {
            "status": "processing",
            "progress": task_result.info.get('progress', 0),
            "step": task_result.info.get('step', '')
        }
    elif task_result.state == 'SUCCESS':
        return {
            "status": "success",
            "progress": 100,
            "step": "done",
            "result": task_result.result
        }
    else:
        return {
            "status": "failed",
            "error": str(task_result.info)
        }

from fastapi import WebSocket, WebSocketDisconnect
import asyncio

@router.websocket("/ws/status/{task_id}")
async def websocket_analysis_status(websocket: WebSocket, task_id: str):
    await websocket.accept()
    try:
        while True:
            task_result = AsyncResult(task_id)
            if task_result.state == 'PENDING':
                await websocket.send_json({"status": "processing", "progress": 0, "step": "pending"})
            elif task_result.state == 'PROGRESS':
                await websocket.send_json({
                    "status": "processing",
                    "progress": task_result.info.get('progress', 0),
                    "step": task_result.info.get('step', '')
                })
            elif task_result.state == 'SUCCESS':
                await websocket.send_json({
                    "status": "success",
                    "progress": 100,
                    "step": "done",
                    "result": task_result.result
                })
                break  # Task finished, close connection
            elif task_result.state == 'FAILURE':
                await websocket.send_json({
                    "status": "failed",
                    "error": str(task_result.info)
                })
                break  # Task failed, close connection
            
            await asyncio.sleep(1)  # Check status every second
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for task {task_id}")
