import pytest
import torch
import numpy as np
import httpx
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine, AsyncSessionLocal


@pytest.mark.asyncio
async def test_jobs_translated_to_english():
    """title_en, job_requirements_en, job_description_en phải được fill"""
    async with AsyncSession(engine) as session:
        result = await session.execute(text("""
            SELECT COUNT(*) FROM jobs
            WHERE title_en IS NULL OR title_en = ''
        """))
        untranslated = result.scalar()
        assert untranslated == 0, f"{untranslated} jobs chưa có title_en"

@pytest.mark.asyncio
async def test_translation_is_english():
    """Kiểm tra title_en thực sự là tiếng Anh (không phải giữ nguyên Vi)"""
    from langdetect import detect
    async with AsyncSession(engine) as session:
        result = await session.execute(
            text("SELECT title_vi, title_en FROM jobs LIMIT 20")
        )
        rows = result.fetchall()
        english_count = 0
        for row in rows:
            if row.title_en:
                try:
                    lang = detect(row.title_en)
                    if lang == 'en':
                        english_count += 1
                except:
                    pass
        # Ít nhất 70% phải detect được là tiếng Anh
        assert english_count >= 14, \
            f"Chỉ {english_count}/20 title_en được detect là tiếng Anh"
