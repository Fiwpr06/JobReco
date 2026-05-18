import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy import func

# Force utf-8 output encoding for Windows terminal compatibility
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models.job import Job, Company

async def test_db():
    async with AsyncSessionLocal() as session:
        jobs_count = await session.execute(select(func.count(Job.id)))
        companies_count = await session.execute(select(func.count(Company.id)))
        
        num_jobs = jobs_count.scalar()
        num_comps = companies_count.scalar()
        
        print(f"Total jobs in DB: {num_jobs}")
        print(f"Total companies in DB: {num_comps}")
        
        # Check first 5 jobs
        first_jobs = await session.execute(select(Job).limit(5))
        for job in first_jobs.scalars().all():
            print(f"- Job ID: {job.job_id} | Title: {job.title_vi} | Company: {job.company_name_vi}")
            print(f"  URL: {job.apply_url}")
            print(f"  Salary Min: {job.salary_min_vnd} | Max: {job.salary_max_vnd} | Is Neg: {job.salary_is_negotiable} (Raw: {job.salary_raw})")
            print(f"  Exp Min: {job.experience_min_years} | Max: {job.experience_max_years} (Raw: {job.experience_raw})")
            print("-" * 50)

if __name__ == "__main__":
    asyncio.run(test_db())
