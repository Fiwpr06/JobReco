import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy import func

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models.job import Job, JobSkill

async def check():
    async with AsyncSessionLocal() as session:
        total = await session.execute(select(func.count(Job.id)))
        translated = await session.execute(select(func.count(Job.id)).where(Job.job_requirements_en != None))
        embedded = await session.execute(select(func.count(Job.id)).where(Job.embedding != None))
        skills_links = await session.execute(select(func.count(JobSkill.id)))
        
        print("-" * 40)
        print("PIPELINE DATABASE PROGRESS STATS:")
        print(f"Total active jobs in DB: {total.scalar()}")
        print(f"Jobs with English requirements: {translated.scalar()}")
        print(f"Jobs with semantic embeddings: {embedded.scalar()}")
        print(f"Total Job-Skill relationships: {skills_links.scalar()}")
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(check())
