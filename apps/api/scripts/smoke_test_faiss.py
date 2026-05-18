import asyncio
import os
import sys
import numpy as np
from sqlalchemy.future import select

# Force utf-8 output encoding for Windows terminal compatibility
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models.job import Job
from app.ml.embedding import SentenceTransformerEmbedding
from app.ml.faiss_index import FAISSIndexManager
from app.config import settings

async def smoke_test_search(queries: list[str]):
    print("=" * 75)
    print("AI JOB SYSTEM - FAISS SEMANTIC SEARCH SMOKE TEST")
    print("=" * 75)
    
    # 1. Initialize services
    print("Initializing services...")
    embedding_service = SentenceTransformerEmbedding()
    index_manager = FAISSIndexManager(dimension=settings.EMBEDDING_DIM)
    
    faiss_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../faiss_indexes/index.faiss"))
    
    if not os.path.exists(faiss_path):
        print(f"[Error] FAISS index file not found at {faiss_path}")
        print("Please wait for scripts/build_faiss_index.py to finish building the index first.")
        return
        
    print(f"Loading FAISS index from {faiss_path}...")
    index_manager.load(faiss_path)
    
    async with AsyncSessionLocal() as session:
        for idx, query in enumerate(queries, 1):
            print("\n" + "-" * 75)
            print(f"QUERY {idx}: '{query}'")
            print("-" * 75)
            
            # 2. Embed the query text
            query_vector = embedding_service.get_embedding(query)
            
            # 3. Search the FAISS index
            search_results = index_manager.search(query_vector, k=5)
            
            if not search_results:
                print("No matching jobs found in FAISS index.")
                continue
                
            print(f"Top 5 matching jobs:")
            for rank, (db_id, score) in enumerate(search_results, 1):
                # Fetch job details from DB
                result = await session.execute(select(Job).filter(Job.id == db_id))
                job = result.scalars().first()
                if job:
                    print(f"  {rank}. [Score: {score:.4f}] Job ID: {job.job_id}")
                    print(f"     Title (Vi): {job.title_vi}")
                    print(f"     Title (En): {job.title_en}")
                    print(f"     Company   : {job.company_name_vi}")
                    print(f"     Salary    : {job.salary_raw} | Exp: {job.experience_raw}")
                    print(f"     URL       : {job.apply_url}")
                else:
                    print(f"  {rank}. [Score: {score:.4f}] DB ID: {db_id} (Job details not found in DB)")
    print("=" * 75)

async def main():
    test_queries = [
        "Python Backend Developer",
        "Kế toán thuế tổng hợp",
        "Nhân viên Chăm sóc khách hàng",
        "Kỹ sư thiết kế cơ khí AutoCAD SolidWorks",
        "IT Security Lead cybersecurity"
    ]
    await smoke_test_search(test_queries)

if __name__ == "__main__":
    asyncio.run(main())
