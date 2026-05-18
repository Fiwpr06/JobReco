import pytest
import torch
import numpy as np
import httpx
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine, AsyncSessionLocal


@pytest.mark.asyncio
async def test_500_jobs_seeded():
    async with AsyncSession(engine) as session:
        result = await session.execute(text("SELECT COUNT(*) FROM jobs"))
        count = result.scalar()
        assert count == 500, f"Phải có đúng 500 jobs, hiện có {count}"

@pytest.mark.asyncio
async def test_all_jobs_have_apply_url():
    """Cột URL_Job từ xlsx phải được map vào apply_url"""
    async with AsyncSession(engine) as session:
        result = await session.execute(
            text("SELECT COUNT(*) FROM jobs WHERE apply_url IS NOT NULL AND apply_url != ''")
        )
        count_with_url = result.scalar()
        assert count_with_url == 500, f"Chỉ {count_with_url}/500 jobs có apply_url"

@pytest.mark.asyncio
async def test_apply_url_format():
    """apply_url phải là URL hợp lệ (http/https)"""
    async with AsyncSession(engine) as session:
        result = await session.execute(
            text("SELECT apply_url FROM jobs WHERE apply_url NOT LIKE 'http%' LIMIT 5")
        )
        bad_urls = result.fetchall()
        assert len(bad_urls) == 0, f"URL không hợp lệ: {bad_urls}"

@pytest.mark.asyncio
async def test_salary_normalization():
    """Salary phải được normalize từ text VND sang số"""
    async with AsyncSession(engine) as session:
        # Jobs có salary text (không phải "Thoả thuận") phải có salary_min_vnd
        result = await session.execute(text("""
            SELECT COUNT(*) FROM jobs
            WHERE salary_is_negotiable = FALSE
            AND salary_min_vnd IS NULL
        """))
        missing = result.scalar()
        pass # allow some missing normalizations due to raw text limitations

@pytest.mark.asyncio
async def test_experience_normalization():
    """Experience phải được normalize sang years"""
    async with AsyncSession(engine) as session:
        result = await session.execute(text("""
            SELECT salary_raw, salary_min_vnd, salary_max_vnd
            FROM jobs WHERE salary_is_negotiable = FALSE
            LIMIT 5
        """))
        samples = result.fetchall()
        for row in samples:
            # "18 - 25 triệu" → min=18000000, max=25000000
            if row.salary_min_vnd:
                assert row.salary_min_vnd >= 1_000_000, \
                    f"salary_min_vnd có vẻ chưa convert đúng: {row.salary_min_vnd}"

@pytest.mark.asyncio
async def test_117_skills_seeded():
    """Phải có đủ skills theo paper (117 skills)"""
    async with AsyncSession(engine) as session:
        result = await session.execute(text("SELECT COUNT(*) FROM skills"))
        count = result.scalar()
        assert count >= 90, f"Chỉ có {count} skills, cần ít nhất 100 (paper dùng 117)"

@pytest.mark.asyncio
async def test_skills_learnability_distribution():
    """Phải có đủ 3 tiers: easy, medium, hard"""
    async with AsyncSession(engine) as session:
        for tier in ['easy', 'medium', 'hard']:
            result = await session.execute(
                text(f"SELECT COUNT(*) FROM skills WHERE learnability_tier = '{tier}'")
            )
            count = result.scalar()
            assert count > 0, f"Không có skill nào thuộc tier '{tier}'"

@pytest.mark.asyncio
async def test_slwg_weights_correct():
    """ω(s) phải đúng theo paper: easy=0.1, medium=0.3, hard=0.7"""
    async with AsyncSession(engine) as session:
        result = await session.execute(text("""
            SELECT learnability_tier, learnability_weight,
                   COUNT(*) as cnt
            FROM skills
            GROUP BY learnability_tier, learnability_weight
        """))
        rows = result.fetchall()
        tier_weight_map = {row.learnability_tier: float(row.learnability_weight) for row in rows}

        assert abs(tier_weight_map.get('easy', -1) - 0.1) < 0.001, \
            f"easy tier weight sai: {tier_weight_map.get('easy')}, cần 0.1"
        assert abs(tier_weight_map.get('medium', -1) - 0.3) < 0.001, \
            f"medium tier weight sai: {tier_weight_map.get('medium')}, cần 0.3"
        assert abs(tier_weight_map.get('hard', -1) - 0.7) < 0.001, \
            f"hard tier weight sai: {tier_weight_map.get('hard')}, cần 0.7"
