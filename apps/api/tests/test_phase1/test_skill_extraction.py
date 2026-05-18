import pytest
import torch
import numpy as np
import httpx
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine, AsyncSessionLocal


@pytest.mark.asyncio
async def test_job_skills_extracted():
    """Mỗi job phải có ít nhất 1 skill được extract"""
    async with AsyncSession(engine) as session:
        result = await session.execute(text("""
            SELECT COUNT(DISTINCT job_id) FROM job_skills
        """))
        jobs_with_skills = result.scalar()
        # Ít nhất 80% jobs phải có skill
        assert jobs_with_skills >= 400, \
            f"Chỉ {jobs_with_skills}/500 jobs có skill được extract"

@pytest.mark.asyncio
async def test_total_job_skill_edges():
    """Paper có 3,150 job-skill edges trên 500 jobs"""
    async with AsyncSession(engine) as session:
        result = await session.execute(
            text("SELECT COUNT(*) FROM job_skills")
        )
        count = result.scalar()
        # Chấp nhận range hợp lý: 1,000 - 10,000 edges
        assert 1000 <= count <= 10000, \
            f"Số job-skill edges bất thường: {count} (paper: ~3,150)"

@pytest.mark.asyncio
async def test_skills_mapped_to_ontology():
    """Skills extract phải được map vào skill ontology (có skill_id hợp lệ)"""
    async with AsyncSession(engine) as session:
        result = await session.execute(text("""
            SELECT COUNT(*) FROM job_skills js
            LEFT JOIN skills s ON js.skill_id = s.id
            WHERE s.id IS NULL
        """))
        unmapped = result.scalar()
        assert unmapped == 0, f"{unmapped} job_skills chưa map được vào skill ontology"
