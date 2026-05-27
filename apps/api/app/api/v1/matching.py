from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Optional
import asyncio
import datetime
from datetime import timezone as tz
import os
import torch
import numpy as np

from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.cv import CV, CVSkill
from app.models.job import Job, JobSkill
from app.models.skill import Skill
from app.models.match import JobMatch
from app.schemas.match import MatchRequest, JobMatchResponse, SkillGapAnalysis, SkillGapDetail, MatchAPIResponse, MatchResultItem, MatchResultScores, SkillGapDetailTest, SkillGapAnalysisTest
from app.services.auth_service import get_db, get_current_user
from app.ml.hgat.model import CVConditionedHGAT
from app.ml.hgat.slwg import SLWGComputer
from app.ml.hgat.graph_builder import RecruitmentGraphBuilder
from app.ml.embedding import SentenceTransformerEmbedding
from app.utils.cache import hybrid_cache
from app.services.groq_service import GroqService
from app.config import settings

from app.ml.faiss_index import FAISSIndexManager, get_faiss_manager

router = APIRouter()

# [CRIT-6 FIX] asyncio.Lock prevents concurrent requests from loading the
# GNN model and graph multiple times simultaneously.
_model_load_lock = asyncio.Lock()

GRAPH_PATH = os.path.join(os.getcwd(), "data", "graph.pt")
MODEL_WEIGHTS_PATH = os.path.join(os.getcwd(), "models_saved", "hgat_v1.pt")

_cached_graph = None
_cached_model = None

async def preload_matching_assets():
    global _cached_graph, _cached_model
    async with _model_load_lock:
        if os.path.exists(GRAPH_PATH) and os.path.exists(MODEL_WEIGHTS_PATH):
            try:
                if _cached_graph is None:
                    builder = RecruitmentGraphBuilder()
                    _cached_graph = builder.load_graph(GRAPH_PATH)
                graph = _cached_graph
                
                node_counts = {
                    'job': graph['job'].x.size(0),
                    'skill': graph['skill'].x.size(0),
                    'company': graph['company'].x.size(0),
                    'location': graph['location'].x.size(0),
                    'category': graph['category'].x.size(0)
                }
                
                if _cached_model is None:
                    model = CVConditionedHGAT(
                        node_counts=node_counts,
                        in_dim=settings.EMBEDDING_DIM,
                        hidden_dim=settings.HGAT_HIDDEN_DIM,
                        num_heads=settings.HGAT_NUM_HEADS,
                        num_layers=settings.HGAT_NUM_LAYERS,
                        dropout=0.0 # eval mode
                    )
                    state_dict = torch.load(MODEL_WEIGHTS_PATH, map_location=torch.device('cpu'), weights_only=False)
                    model.load_state_dict(state_dict)
                    model.eval()
                    _cached_model = model
                print("GNN model and graph pre-loaded successfully during application startup!")
            except Exception as e:
                print(f"Preloading GNN model/graph failed: {e}")

@router.post("/", response_model=MatchAPIResponse)
@router.post("/cv-to-jobs", response_model=MatchAPIResponse)
async def get_job_recommendations(
    req: MatchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    global _cached_graph, _cached_model

    # 1. Fetch requested CV or fallback to user's primary CV
    stmt = select(CV).options(
        selectinload(CV.skills).selectinload(CVSkill.skill)
    ).where(CV.deleted_at.is_(None), CV.user_id == current_user.id)
    
    if req.cv_id:
        stmt = stmt.where(CV.deleted_at.is_(None), CV.id == req.cv_id)
    else:
        stmt = stmt.where(CV.is_primary == True)
        
    result = await db.execute(stmt)
    cv = result.scalars().first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV profile not found. Please upload a CV first."
        )
        
    cv_skill_ids = {sk.skill_id for sk in cv.skills}
    cv_skills_by_id = {sk.skill_id: sk for sk in cv.skills}
    
    if cv.embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CV has not been processed for matching yet. Please wait for analysis to complete."
        )
    
    # 2. Use FAISS index to query top-50 candidate job IDs
    candidate_job_ids = []
    try:
        manager = get_faiss_manager(dimension=settings.EMBEDDING_DIM)
        if manager.total_vectors > 0:
            search_results = manager.search(cv.embedding, k=settings.FAISS_TOP_K_CANDIDATES)
            candidate_job_ids = [job_id for job_id, _ in search_results]
    except Exception as e:
        print(f"FAISS search failed: {e}")
            
    # Fetch active jobs in database (restricted by FAISS candidate IDs if available)
    if candidate_job_ids:
        jobs_query = await db.execute(
            select(Job)
            .options(
                selectinload(Job.company),
                selectinload(Job.skills).selectinload(JobSkill.skill)
            )
            .where(Job.deleted_at.is_(None), Job.is_active == True)
            .where(Job.id.in_(candidate_job_ids))
        )
    else:
        jobs_query = await db.execute(
            select(Job)
            .options(
                selectinload(Job.company),
                selectinload(Job.skills).selectinload(JobSkill.skill)
            )
            .where(Job.deleted_at.is_(None), Job.is_active == True)
        )
    jobs = jobs_query.scalars().all()
    
    if not jobs:
        return MatchAPIResponse(
            cv_id=cv.id,
            model_version="hgat_v1",
            computed_at=datetime.datetime.now(tz.utc),
            total_candidates_evaluated=0,
            results=[]
        )
        
    # We will compute GNN scores if the graph and model weights are ready
    gnn_scores_dict = {}
    use_gnn_fallback = True
    
    if os.path.exists(GRAPH_PATH) and os.path.exists(MODEL_WEIGHTS_PATH):
        cache_key = f"gnn_scores:cv:{cv.id}"
        cached_scores = await hybrid_cache.get(cache_key)
        
        if cached_scores:
            # We must convert str keys (from JSON) back to int
            gnn_scores_dict = {int(k): float(v) for k, v in cached_scores.items()}
            use_gnn_fallback = False
        else:
            # [CRIT-4 FIX] Removed the artificial await asyncio.sleep(0.8) that
            # was injected here — it added 800ms latency to every GNN request for no reason.
            # [CRIT-6 FIX] Lock prevents concurrent requests from loading the model twice.
            async with _model_load_lock:
                try:
                    # Load graph only once
                    if _cached_graph is None:
                        builder = RecruitmentGraphBuilder()
                        _cached_graph = builder.load_graph(GRAPH_PATH)
                    graph = _cached_graph
                    
                    node_counts = {
                        'job': graph['job'].x.size(0),
                        'skill': graph['skill'].x.size(0),
                        'company': graph['company'].x.size(0),
                        'location': graph['location'].x.size(0),
                        'category': graph['category'].x.size(0)
                    }
                    
                    # Load model only once
                    if _cached_model is None:
                        model = CVConditionedHGAT(
                            node_counts=node_counts,
                            in_dim=settings.EMBEDDING_DIM,
                            hidden_dim=settings.HGAT_HIDDEN_DIM,
                            num_heads=settings.HGAT_NUM_HEADS,
                            num_layers=settings.HGAT_NUM_LAYERS,
                            dropout=0.0 # eval mode
                        )
                        # Load model state
                        # [HIGH-3 FIX applied here too] weights_only=False is explicit
                        state_dict = torch.load(MODEL_WEIGHTS_PATH, map_location=torch.device('cpu'), weights_only=False)
                        model.load_state_dict(state_dict)
                        model.eval()
                        _cached_model = model
                    else:
                        model = _cached_model
                    
                    # Prepare inputs
                    cv_embedding_tensor = torch.tensor(cv.embedding, dtype=torch.float)
                    slwg_computer_gnn = SLWGComputer()
                    
                    with torch.no_grad():
                        # Forward GNN pass
                        node_embeds, c_prime = model(graph, cv_embedding_tensor, cv_skill_ids, slwg_computer_gnn)
                        job_embeds = node_embeds['job']
                        
                        # Compute scores
                        gnn_scores = model.score(c_prime, job_embeds)
                        
                        # Map graph index back to job database IDs
                        for job in jobs:
                            if job.graph_node_id is not None and job.graph_node_id < len(gnn_scores):
                                gnn_scores_dict[job.id] = float(gnn_scores[job.graph_node_id])
                                
                    # Cache the successfully computed GNN scores
                    await hybrid_cache.set(cache_key, gnn_scores_dict)
                    use_gnn_fallback = False
                except Exception as e:
                    # Fail silently and log fallback
                    print(f"GNN Loading failed: {e}. Falling back to semantic similarity matching...")

            
    # Fallback/alternative matching score (Cosine Similarity of static embeddings)
    if use_gnn_fallback:
        cv_emb_np = np.array(cv.embedding)
        for job in jobs:
            if job.embedding:
                job_emb_np = np.array(job.embedding)
                sim = np.dot(cv_emb_np, job_emb_np) / (np.linalg.norm(cv_emb_np) * np.linalg.norm(job_emb_np) + 1e-8)
                gnn_scores_dict[job.id] = float(sim)
            else:
                gnn_scores_dict[job.id] = 0.5
                
    # 3. Formulate Match Results and explanations
    match_results = []
    slwg_computer = SLWGComputer()
    
    for job in jobs:
        hgat_score = gnn_scores_dict.get(job.id, 0.5)
        # Shift cosine score range from [-1, 1] to [0, 1] for presentation
        hgat_score_normalized = max(0.0, (hgat_score + 1.0) / 2.0) if not use_gnn_fallback else hgat_score
        
        # Calculate sub-scores
        # a. Skill match score
        job_required_skill_ids = {js.skill_id for js in job.skills if js.is_required}
        job_preferred_skill_ids = {js.skill_id for js in job.skills if not js.is_required}
        job_all_skill_ids = {js.skill_id for js in job.skills}
        
        overlap_skills = cv_skill_ids & job_all_skill_ids
        skill_match_score = len(overlap_skills) / len(job_all_skill_ids) if job_all_skill_ids else 0.0
        
        # b. Experience match score
        experience_match_score = 1.0
        if job.experience_min_years is not None and job.experience_min_years > 0:
            experience_match_score = min(1.0, float(cv.experience_years or 0.0) / float(job.experience_min_years))
            
        # c. Salary match score
        salary_match_score = 1.0
        if cv.expected_salary_min_vnd and not job.salary_is_negotiable:
            job_max = job.salary_max_vnd
            cand_min = cv.expected_salary_min_vnd
            if job_max and cand_min and cand_min > job_max:
                salary_match_score = max(0.0, 1.0 - (cand_min - job_max) / job_max)
                
        # d. Location match score
        location_match_score = 0.0
        if not cv.preferred_locations:
            location_match_score = 1.0
        elif job.job_address:
            job_addr_lower = job.job_address.lower()
            for loc in cv.preferred_locations:
                if loc.lower() in job_addr_lower:
                    location_match_score = 1.0
                    break
                    
        # e. Unified overall score
        # 50% GNN, 20% Skill, 10% Exp, 10% Salary, 10% Location
        overall_score = (
            0.5 * hgat_score_normalized + 
            0.2 * skill_match_score + 
            0.1 * experience_match_score + 
            0.1 * salary_match_score + 
            0.1 * location_match_score
        )
        
        # f. Skill Gap details via SLWG
        # [HIGH-4 FIX] Use compute_advisory() instead of compute_bias() to get
        # SLWGAdvisoryResult which has .missing_required / .missing_preferred / .total_penalty.
        # The legacy compute_bias() shim returns the same type but is misleadingly named;
        # calling compute_advisory() is explicit and avoids any future confusion.
        missing_required = []
        missing_preferred = []
        matching_names = []
        
        # Prepare edge metadata for SLWGComputer
        job_skill_edges = []
        for js in job.skills:
            job_skill_edges.append((job.id, js.skill_id, js.skill, js.is_required))
            
        slwg_res = slwg_computer.compute_advisory(cv_skill_ids, job_skill_edges)
        
        # Convert SLWG missing skills details to schemas
        for item in slwg_res.missing_required:
            missing_required.append(SkillGapDetail(
                skill_name=item["skill"],
                learnability_tier=item["tier"],
                learnability_weight=item["omega"],
                penalty_applied=item["slwg_penalty"],
                is_required=True
            ))
            
        for item in slwg_res.missing_preferred:
            missing_preferred.append(SkillGapDetail(
                skill_name=item["skill"],
                learnability_tier=item["tier"],
                learnability_weight=item["omega"],
                penalty_applied=item["slwg_penalty"],
                is_required=False
            ))
            
        for js in job.skills:
            if js.skill_id in cv_skill_ids:
                matching_names.append(js.skill.name)
                
        gap_analysis = SkillGapAnalysis(
            missing_required_skills=missing_required,
            missing_preferred_skills=missing_preferred,
            matching_skills=matching_names,
            slwg_total_penalty=slwg_res.total_penalty
        )
        
        # Write beautiful explanation breakdown
        explanation = f"So khớp hồ sơ '{cv.title_en}' với công việc '{job.title_vi or job.title_en}'. "
        if overall_score >= 0.8:
            explanation += "Bạn là một ứng cử viên xuất sắc cho vị trí này! "
        elif overall_score >= 0.6:
            explanation += "Bạn là ứng cử viên tiềm năng với mức độ phù hợp tốt. "
        else:
            explanation += "Bạn đáp ứng một số yêu cầu nhưng vẫn còn một vài khoảng cách về kỹ năng hoặc kinh nghiệm. "
            
        explanation += f"Chúng tôi tìm thấy {len(matching_names)} kỹ năng phù hợp ({', '.join(matching_names[:5])})."
        
        if missing_required:
            missing_names = [s.skill_name for s in missing_required]
            explanation += f" Tuy nhiên, bạn đang thiếu một số kỹ năng bắt buộc quan trọng: {', '.join(missing_names[:3])}."
            
            # Focus on easy learnable skills
            easy_skills = [s.skill_name for s in missing_required if s.learnability_tier == "easy"]
            if easy_skills:
                explanation += f" Bạn có thể nhanh chóng cải thiện các khoảng cách này bằng cách học thêm về '{', '.join(easy_skills[:2])}' - các kỹ năng dễ tiếp thu trong vài tuần."
        
        # [CRIT-3 FIX] Use job.apply_url (the real external TopCV/job-board URL stored in DB)
        # instead of hardcoding http://localhost:8000/... which breaks in all non-local deployments.
        # The internal tracking redirect remains available via GET /api/v1/jobs/{id}/apply.
        apply_redirect_url = job.apply_url
        
        match_results.append(JobMatchResponse(
            id=job.id, # Using job DB ID as match primary reference
            cv_id=cv.id,
            job_id=job.id,
            hgat_score=round(hgat_score_normalized, 4),
            skill_match_score=round(skill_match_score, 4),
            experience_match_score=round(experience_match_score, 4),
            salary_match_score=round(salary_match_score, 4),
            location_match_score=round(location_match_score, 4),
            overall_score=round(overall_score, 4),
            slwg_total_penalty=round(slwg_res.total_penalty, 4),
            skill_gap_analysis=gap_analysis,
            explanation=explanation,
            apply_url=apply_redirect_url,
            computed_at=datetime.datetime.now(tz.utc),
            job=job
        ))
        
    # Sort descending by overall matching score
    match_results.sort(key=lambda x: x.overall_score, reverse=True)
    
    # Apply rank index positions
    for idx, match in enumerate(match_results):
        match.rank_position = idx + 1
        
    top_results = match_results[:req.top_k]
    
    # Proactively persist top-5 matches in JobMatch DB schema for analytics & history tracking
    matches_to_add = []
    for match in top_results[:5]:
        exists_stmt = select(JobMatch).where(
            JobMatch.cv_id == match.cv_id,
            JobMatch.job_id == match.job_id
        )
        exists_res = await db.execute(exists_stmt)
        db_match = exists_res.scalars().first()
        
        if not db_match:
            new_db_match = JobMatch(
                cv_id=match.cv_id,
                job_id=match.job_id,
                hgat_score=match.hgat_score,
                skill_match_score=match.skill_match_score,
                experience_match_score=match.experience_match_score,
                salary_match_score=match.salary_match_score,
                location_match_score=match.location_match_score,
                overall_score=match.overall_score,
                slwg_total_penalty=match.slwg_total_penalty,
                skill_gap_analysis=match.skill_gap_analysis.model_dump() if match.skill_gap_analysis else None,
                explanation=match.explanation,
                apply_url=match.apply_url,
                rank_position=match.rank_position,
                model_version="hgat_v1"
            )
            matches_to_add.append(new_db_match)
            
    if matches_to_add:
        try:
            for new_db_match in matches_to_add:
                db.add(new_db_match)
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"Analytics persistence failed: {e}")
    
    # Convert top_results to MatchResultItem list
    api_results = []
    for match in top_results:
        # Build MatchResultScores
        match_scores = MatchResultScores(
            overall=round(match.overall_score, 4),
            skill_match=round(match.skill_match_score, 4),
            slwg_total_penalty=round(match.slwg_total_penalty, 4),
            hgat_cosine=round(match.hgat_score, 4),
            experience_match=round(match.experience_match_score, 4),
            salary_match=round(match.salary_match_score, 4),
            location_match=round(match.location_match_score, 4)
        )
        
        # Build SkillGapAnalysisTest
        missing_req = []
        if match.skill_gap_analysis and match.skill_gap_analysis.missing_required_skills:
            for x in match.skill_gap_analysis.missing_required_skills:
                missing_req.append(SkillGapDetailTest(
                    skill=x.skill_name,
                    tier=x.learnability_tier,
                    omega=x.learnability_weight,
                    slwg_penalty=x.penalty_applied,
                    suggestion=f"Bồi dưỡng kỹ năng bắt buộc này bằng cách học '{x.skill_name}'."
                ))
            
        missing_pref = []
        if match.skill_gap_analysis and match.skill_gap_analysis.missing_preferred_skills:
            for x in match.skill_gap_analysis.missing_preferred_skills:
                missing_pref.append(SkillGapDetailTest(
                    skill=x.skill_name,
                    tier=x.learnability_tier,
                    omega=x.learnability_weight,
                    slwg_penalty=x.penalty_applied,
                    suggestion=f"Cải thiện kỹ năng ưu tiên này bằng cách học '{x.skill_name}'."
                ))
            
        skill_analysis_test = SkillGapAnalysisTest(
            matched_skills=match.skill_gap_analysis.matching_skills if match.skill_gap_analysis else [],
            missing_required=missing_req,
            missing_preferred=missing_pref
        )
        
        # Resolve company_name safely
        company_name = None
        if match.job:
            if match.job.company:
                company_name = match.job.company.name_en or match.job.company.name_vi
            else:
                company_name = match.job.company_name_en or match.job.company_name_vi
        
        # Build MatchResultItem
        api_results.append(MatchResultItem(
            rank=match.rank_position,
            job_id=match.job_id,
            title_en=match.job.title_en if match.job else None,
            title_vi=match.job.title_vi if match.job else None,
            company_name=company_name,
            job_address=match.job.job_address if match.job else None,
            salary_display=match.job.salary_raw if match.job else None,
            salary_min_vnd=match.job.salary_min_vnd if match.job else None,
            salary_max_vnd=match.job.salary_max_vnd if match.job else None,
            job_type=match.job.job_type if match.job else None,
            apply_url=match.apply_url,
            scores=match_scores,
            skill_analysis=skill_analysis_test,
            explanation=match.explanation
        ))
        
    return MatchAPIResponse(
        cv_id=cv.id,
        model_version="hgat_v1",
        computed_at=datetime.datetime.now(tz.utc),
        total_candidates_evaluated=len(jobs),
        results=api_results
    )


@router.get("/{job_id}/explain-groq")
async def explain_match_with_groq(
    job_id: int,
    cv_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Retrieve the match record
    stmt = select(JobMatch).options(
        selectinload(JobMatch.job),
        selectinload(JobMatch.cv)
    ).where(JobMatch.job_id == job_id)
    
    if cv_id:
        stmt = stmt.where(JobMatch.cv_id == cv_id)
    else:
        # Get the match for the user's primary CV
        stmt = stmt.join(CV, JobMatch.cv_id == CV.id).where(
            CV.user_id == current_user.id,
            CV.is_primary == True
        )
        
    result = await db.execute(stmt)
    match = result.scalars().first()
    
    if not match:
        raise HTTPException(status_code=404, detail="JobMatch record not found. Please run matching first.")
        
    groq_service = GroqService()
    
    # Parse skill gap analysis
    gap_analysis = match.skill_gap_analysis or {}
    matched_skills = gap_analysis.get("matching_skills", [])
    missing_req = gap_analysis.get("missing_required_skills", [])
    missing_pref = gap_analysis.get("missing_preferred_skills", [])
    
    explanation = await groq_service.generate_explanation(
        cv_title=match.cv.title_en or "Hồ sơ ứng viên",
        job_title=match.job.title_en or match.job.title_vi or "Công việc",
        overall_score=match.overall_score,
        matched_skills=matched_skills,
        missing_required=missing_req,
        missing_preferred=missing_pref
    )
    
    # Update the match record with Groq explanation
    match.explanation = explanation
    await db.commit()
    
    return {"explanation": explanation}

