import asyncio
import os
import sys
import time
from datetime import datetime
import numpy as np
from sqlalchemy.future import select
from sqlalchemy import delete

# Force utf-8 output encoding for Windows terminal compatibility
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models.job import Job, JobSkill
from app.models.skill import Skill
from app.pipelines.translator import TranslationService
from app.pipelines.skill_extractor import HybridSkillExtractor
from app.ml.embedding import SentenceTransformerEmbedding
from app.ml.faiss_index import FAISSIndexManager
from app.config import settings

async def translate_field(translator: TranslationService, text: str, field_name: str, delay: float = 0.15) -> str:
    if not text or not text.strip():
        return ""
    try:
        await asyncio.sleep(delay)  # polite delay to prevent rate limits
        translated = translator.translate_vi_to_en(text)
        return translated
    except Exception as e:
        print(f"  [Warning] Failed to translate {field_name}: {e}. Using original.")
        return text

async def build_faiss_pipeline():
    print("=" * 60)
    print("AI JOB SYSTEM - PIPELINE RUNNER (PHASE 1)")
    print("=" * 60)
    
    # Initialize services
    print("Initializing services...")
    translator = TranslationService()
    embedding_service = SentenceTransformerEmbedding()
    
    async with AsyncSessionLocal() as session:
        # Load all skills to warm up extractor cache
        extractor = HybridSkillExtractor(db_session=session)
        await extractor._load_skills_if_needed()
        print(f"Skills loaded in extractor: {len(extractor.skills_list)}")
        
        # Load all active jobs
        result = await session.execute(select(Job).filter(Job.is_active == True))
        jobs = result.scalars().all()
        total_jobs = len(jobs)
        print(f"Found {total_jobs} active jobs in the database.")
        
        print("\nProcessing translation, skill extraction, and embedding generation...")
        
        processed_count = 0
        skipped_count = 0
        errors_count = 0
        
        for idx, job in enumerate(jobs, 1):
            try:
                # Resumability check: if job has title_en, job_requirements_en, job_description_en, and embedding, we can skip!
                has_en_fields = job.title_en and job.job_requirements_en and job.job_description_en
                # If title_en equals title_vi and it's in Vietnamese, it might not be properly translated, but check if we have embedding
                if has_en_fields and job.embedding is not None:
                    # Let's also check if they have skills extracted
                    skills_result = await session.execute(
                        select(JobSkill).filter(JobSkill.job_id == job.id).limit(1)
                    )
                    has_skills = skills_result.scalars().first() is not None
                    if has_skills:
                        skipped_count += 1
                        continue
                
                print(f"[{idx}/{total_jobs}] Processing Job ID {job.job_id}: {job.title_vi[:40]}...")
                
                # 1. Translate Vietnamese fields to English
                # Title
                if not job.title_en or job.title_en == job.title_vi:
                    job.title_en = await translate_field(translator, job.title_vi, "title")
                
                # Company Name
                if not job.company_name_en or job.company_name_en == job.company_name_vi:
                    job.company_name_en = job.company_name_vi # usually same, but let's ensure it's not None
                    
                # Job Requirements
                if job.job_requirements_vi and not job.job_requirements_en:
                    job.job_requirements_en = await translate_field(translator, job.job_requirements_vi, "requirements")
                elif not job.job_requirements_vi:
                    job.job_requirements_en = ""
                    
                # Job Description
                if job.job_description_vi and not job.job_description_en:
                    job.job_description_en = await translate_field(translator, job.job_description_vi, "description")
                elif not job.job_description_vi:
                    job.job_description_en = ""
                    
                # Benefits
                if job.benefit_vi and not job.benefit_en:
                    job.benefit_en = await translate_field(translator, job.benefit_vi, "benefits")
                elif not job.benefit_vi:
                    job.benefit_en = ""
                
                # 2. Extract matching skills
                combined_text_for_skills = f"{job.title_vi or ''} {job.job_requirements_vi or ''} {job.job_description_vi or ''}"
                matched_skills = await extractor.extract_skills(combined_text_for_skills)
                
                # Remove existing associations for safety
                await session.execute(delete(JobSkill).where(JobSkill.job_id == job.id))
                
                # Add new associations
                skills_added = []
                for skill in matched_skills:
                    job_skill = JobSkill(
                        job_id=job.id,
                        skill_id=skill.id,
                        is_required=True,
                        importance_rank=1,
                        extracted_by='nlp'
                    )
                    session.add(job_skill)
                    skills_added.append(skill.name)
                
                if skills_added:
                    print(f"  Extracted skills ({len(skills_added)}): {', '.join(skills_added[:5])}...")
                else:
                    print("  No skills extracted.")
                
                # 3. Generate Semantic Text & Embeddings
                semantic_parts = []
                if job.title_en:
                    semantic_parts.append(job.title_en)
                elif job.title_vi:
                    semantic_parts.append(job.title_vi)
                    
                if job.company_name_en:
                    semantic_parts.append(job.company_name_en)
                    
                if job.job_requirements_en:
                    semantic_parts.append(f"Requirements: {job.job_requirements_en}")
                elif job.job_requirements_vi:
                    semantic_parts.append(f"Requirements: {job.job_requirements_vi}")
                    
                if job.job_description_en:
                    semantic_parts.append(f"Description: {job.job_description_en}")
                elif job.job_description_vi:
                    semantic_parts.append(f"Description: {job.job_description_vi}")
                    
                semantic_text = " | ".join(semantic_parts)
                
                embedding_vector = embedding_service.get_embedding(semantic_text)
                job.embedding = embedding_vector
                job.embedded_at = datetime.utcnow()
                job.faiss_index_id = job.id
                
                processed_count += 1
                
                # Commit in batches of 20 to ensure intermediate progress is saved
                if processed_count % 20 == 0:
                    await session.commit()
                    print(f"--> Committed {processed_count} jobs so far...")
                    
            except Exception as ex:
                errors_count += 1
                print(f"  [Error] Failed to process job {job.job_id}: {ex}")
                await session.rollback()
        
        # Final commit for remaining processed jobs
        await session.commit()
        print("-" * 60)
        print(f"Database process completed: {processed_count} processed, {skipped_count} skipped, {errors_count} errors.")
        
        # 4. Build and save the FAISS Index
        print("\nLoading L2-normalized embeddings from Database into FAISS index...")
        result = await session.execute(select(Job).filter(Job.is_active == True, Job.embedding != None))
        embedded_jobs = result.scalars().all()
        
        if not embedded_jobs:
            print("[Error] No jobs with embeddings found! FAISS index cannot be built.")
            return
            
        index_manager = FAISSIndexManager(dimension=settings.EMBEDDING_DIM)
        vectors = []
        ids = []
        
        for j in embedded_jobs:
            vectors.append(j.embedding)
            ids.append(j.id)
            
        index_manager.add(vectors, ids)
        
        faiss_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../faiss_indexes"))
        os.makedirs(faiss_dir, exist_ok=True)
        faiss_path = os.path.join(faiss_dir, "index.faiss")
        
        index_manager.save(faiss_path)
        print(f"Successfully built and saved FAISS index with {len(ids)} vectors to {faiss_path}")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(build_faiss_pipeline())
