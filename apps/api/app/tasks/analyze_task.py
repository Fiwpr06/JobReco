import os
import asyncio
import logging
import json
import uuid
import PyPDF2
import docx
from datetime import datetime

import torch
import numpy as np
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.tasks.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.job import Job, JobSkill
from app.ml.embedding import SentenceTransformerEmbedding
from app.pipelines.skill_extractor import HybridSkillExtractor
from app.ml.faiss_index import FAISSIndexManager
from app.config import settings

# Lazy loading models
from app.ml.hgat.model import CVConditionedHGAT
from app.ml.hgat.slwg import SLWGComputer
from app.ml.hgat.graph_builder import RecruitmentGraphBuilder

logger = logging.getLogger(__name__)

GRAPH_PATH = os.path.join(os.getcwd(), "data", "graph.pt")
MODEL_WEIGHTS_PATH = os.path.join(os.getcwd(), "models_saved", "hgat_v1.pt")

_cached_graph = None
_cached_model = None

def load_hgat_models():
    global _cached_graph, _cached_model
    if _cached_graph is None:
        builder = RecruitmentGraphBuilder()
        if os.path.exists(GRAPH_PATH):
            _cached_graph = builder.load_graph(GRAPH_PATH)
            
    if _cached_model is None and _cached_graph is not None:
        node_counts = {
            'job': _cached_graph['job'].x.size(0),
            'skill': _cached_graph['skill'].x.size(0),
            'company': _cached_graph['company'].x.size(0),
            'location': _cached_graph['location'].x.size(0),
            'category': _cached_graph['category'].x.size(0)
        }
        model = CVConditionedHGAT(
            node_counts=node_counts,
            in_dim=settings.EMBEDDING_DIM,
            hidden_dim=settings.HGAT_HIDDEN_DIM,
            num_heads=settings.HGAT_NUM_HEADS,
            num_layers=settings.HGAT_NUM_LAYERS,
            dropout=0.0
        )
        if os.path.exists(MODEL_WEIGHTS_PATH):
            state_dict = torch.load(MODEL_WEIGHTS_PATH, map_location=torch.device('cpu'), weights_only=False)
            model.load_state_dict(state_dict)
        model.eval()
        _cached_model = model

def extract_text(filepath: str) -> str:
    ext = os.path.splitext(filepath)[1].lower()
    text = ""
    if ext == ".pdf":
        with open(filepath, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n"
    elif ext == ".docx":
        doc = docx.Document(filepath)
        for para in doc.paragraphs:
            text += para.text + "\n"
    else:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
    return text

async def run_analysis_pipeline(task_id: str, filepath: str, update_state):
    update_state(state="PROGRESS", meta={"step": "extract_text", "progress": 20})
    
    # 1. Extract text
    raw_text = extract_text(filepath)
    if not raw_text.strip():
        return {"status": "failed", "error": "Could not extract text from file"}
        
    update_state(state="PROGRESS", meta={"step": "extract_skills", "progress": 40})
    
    # 2. Extract Skills
    async with AsyncSessionLocal() as db:
        extractor = HybridSkillExtractor(db_session=db)
        skills = await extractor.extract_skills(raw_text)
        extracted_skill_names = [s.name for s in skills]
        cv_skill_ids = {s.id for s in skills}
        
    update_state(state="PROGRESS", meta={"step": "generate_embeddings", "progress": 60})
    
    # 3. Generate Embeddings
    embedder = SentenceTransformerEmbedding()
    embedding_text = f"Skills: {' '.join(extracted_skill_names)}. {raw_text[:500]}"
    cv_embedding = embedder.get_embedding(embedding_text)
    
    update_state(state="PROGRESS", meta={"step": "faiss_search", "progress": 80})
    
    # 4. FAISS Search
    index_path = os.path.join(os.getcwd(), "faiss_indexes", "index.faiss")
    candidate_job_ids = []
    if os.path.exists(index_path):
        manager = FAISSIndexManager(dimension=settings.EMBEDDING_DIM)
        manager.load(index_path)
        search_results = manager.search(cv_embedding, k=settings.FAISS_TOP_K_CANDIDATES)
        candidate_job_ids = [job_id for job_id, _ in search_results]

    update_state(state="PROGRESS", meta={"step": "hgat_scoring", "progress": 95})

    # 5. HGAT Re-ranking & formatting
    async with AsyncSessionLocal() as db:
        if candidate_job_ids:
            jobs_query = await db.execute(
                select(Job)
                .options(selectinload(Job.company), selectinload(Job.skills).selectinload(JobSkill.skill))
                .where(Job.is_active == True, Job.id.in_(candidate_job_ids))
            )
        else:
            jobs_query = await db.execute(
                select(Job).options(selectinload(Job.company), selectinload(Job.skills).selectinload(JobSkill.skill)).where(Job.is_active == True).limit(50)
            )
        jobs = jobs_query.scalars().all()
        
    load_hgat_models()
    
    gnn_scores_dict = {}
    if _cached_model and _cached_graph:
        cv_embedding_tensor = torch.tensor(cv_embedding, dtype=torch.float)
        slwg_computer_gnn = SLWGComputer()
        with torch.no_grad():
            node_embeds, c_prime = _cached_model(_cached_graph, cv_embedding_tensor, cv_skill_ids, slwg_computer_gnn)
            job_embeds = node_embeds['job']
            gnn_scores = _cached_model.score(c_prime, job_embeds)
            for job in jobs:
                if job.graph_node_id is not None and job.graph_node_id < len(gnn_scores):
                    gnn_scores_dict[job.id] = float(gnn_scores[job.graph_node_id])
    else:
        # Fallback cosine
        cv_emb_np = np.array(cv_embedding)
        for job in jobs:
            if job.embedding:
                sim = np.dot(cv_emb_np, np.array(job.embedding)) / (np.linalg.norm(cv_emb_np) * np.linalg.norm(np.array(job.embedding)) + 1e-8)
                gnn_scores_dict[job.id] = float(sim)
            else:
                gnn_scores_dict[job.id] = 0.5
                
    # Build Top Matches
    matches = []
    slwg_computer = SLWGComputer()
    for job in jobs:
        score = gnn_scores_dict.get(job.id, 0.5)
        norm_score = max(0.0, (score + 1.0) / 2.0) if _cached_model else score
        
        job_skill_edges = [(job.id, js.skill_id, js.skill, js.is_required) for js in job.skills]
        slwg_res = slwg_computer.compute_advisory(cv_skill_ids, job_skill_edges)
        
        comp_name = "Unknown"
        if job.company:
            comp_name = job.company.name_en or job.company.name_vi
        elif job.company_name_en:
            comp_name = job.company_name_en
            
        overall = 0.5 * norm_score + 0.3 * (len(cv_skill_ids & {js.skill_id for js in job.skills}) / max(1, len(job.skills)))
        
        matches.append({
            "job_id": job.id,
            "company": comp_name,
            "title": job.title_en or job.title_vi,
            "match_score": round(overall, 4),
            "explanation": f"Missing {len(slwg_res.missing_required)} required skills. Penalty: {slwg_res.total_penalty:.1f}",
            "location": job.job_address,
            "salary": job.salary_raw
        })
        
    matches.sort(key=lambda x: x["match_score"], reverse=True)

    update_state(state="PROGRESS", meta={"step": "done", "progress": 100})
    
    # Cleanup temp file
    try:
        os.remove(filepath)
    except:
        pass
        
    return {
        "cv_id": str(uuid.uuid4()), # mock pseudo ID since we didn't save it to DB permanently yet
        "extracted_skills": extracted_skill_names,
        "skill_score": 8.5, # mock score
        "top_matches": matches[:10]
    }

@celery_app.task(bind=True)
def analyze_cv_task(self, filepath: str):
    logger.info(f"Starting CV analysis for {filepath}")
    loop = asyncio.get_event_loop()
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    result = loop.run_until_complete(
        run_analysis_pipeline(self.request.id, filepath, self.update_state)
    )
    return result
