import asyncio
import itertools
from sqlalchemy.future import select
from sqlalchemy import delete
from app.database import AsyncSessionLocal
from app.models.job import Job, JobSkill, JobSimilarity
from loguru import logger

class JaccardSimilarityPipeline:
    """
    Computes Jaccard similarity index on required/preferred skills between all active jobs:
    J(A, B) = |Skills_A intersect Skills_B| / |Skills_A union Skills_B|
    
    Pairs with a similarity >= threshold (default 0.3) are written to the database.
    """
    
    def __init__(self, threshold: float = 0.3):
        self.threshold = threshold

    async def compute_and_save_similarities(self):
        logger.info("Starting Jaccard similarity computation for Job-Job edges...")
        
        async with AsyncSessionLocal() as session:
            # 1. Fetch all active jobs and their linked skill IDs
            jobs_query = await session.execute(select(Job).where(Job.is_active == True))
            jobs = jobs_query.scalars().all()
            
            if not jobs:
                logger.warning("No active jobs found in the database. Aborting Jaccard precomputation.")
                return
            
            logger.info(f"Loaded {len(jobs)} active jobs from database.")

            # 2. Fetch all JobSkill mappings to build skill sets in-memory
            job_skills_query = await session.execute(select(JobSkill))
            job_skills_list = job_skills_query.scalars().all()
            
            job_skills_map = {}
            for js in job_skills_list:
                job_skills_map.setdefault(js.job_id, set()).add(js.skill_id)

            logger.info("Compiling Jaccard scores between job pairs...")
            similarity_records = []
            job_pairs = list(itertools.combinations(jobs, 2))
            
            # Compute similarities
            for job_a, job_b in job_pairs:
                skills_a = job_skills_map.get(job_a.id, set())
                skills_b = job_skills_map.get(job_b.id, set())
                
                if not skills_a or not skills_b:
                    continue
                    
                intersection_size = len(skills_a & skills_b)
                union_size = len(skills_a | skills_b)
                
                jaccard_score = intersection_size / union_size
                
                if jaccard_score >= self.threshold:
                    # We store both bi-directional combinations or single primary key pair?
                    # The table uses PRIMARY KEY (job_id_a, job_id_b).
                    # We can store (job_id_a, job_id_b) where job_id_a < job_id_b to avoid duplicate primary key errors.
                    # PyG graph builder can load them and make it bidirectional.
                    id_a, id_b = min(job_a.id, job_b.id), max(job_a.id, job_b.id)
                    similarity_records.append({
                        "job_id_a": id_a,
                        "job_id_b": id_b,
                        "jaccard_score": round(jaccard_score, 4)
                    })

            logger.info(f"Found {len(similarity_records)} job pairs with Jaccard similarity >= {self.threshold}.")

            # 3. Clear existing similarities in database
            logger.info("Cleaning up old job similarity records...")
            await session.execute(delete(JobSimilarity))
            await session.commit()

            # 4. Bulk insert new similarity records in batches
            if similarity_records:
                batch_size = 1000
                logger.info(f"Inserting similarity records in batches of {batch_size}...")
                for i in range(0, len(similarity_records), batch_size):
                    batch = similarity_records[i : i + batch_size]
                    # Convert dict to model instances
                    instances = [JobSimilarity(**record) for record in batch]
                    session.add_all(instances)
                    await session.commit()
                logger.info("Jaccard similarity computation and database seeding completed successfully.")
            else:
                logger.warning("No job pairs satisfied the similarity threshold. No records written.")
