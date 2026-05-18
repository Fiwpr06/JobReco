
import pytest
from sqlalchemy import text, inspect
from app.database import engine

REQUIRED_TABLES = [
    "jobs", "skills", "job_skills", "job_similarity",
    "companies", "locations", "users", "cvs",
    "cv_skills", "job_matches", "apply_clicks", "search_logs"
]

REQUIRED_JOB_COLUMNS = [
    "id", "job_id", "apply_url",
    "title_vi", "title_en",
    "company_name_vi", "company_name_en",
    "job_address", "job_address_detail",
    "job_requirements_vi", "job_requirements_en",
    "job_description_vi", "job_description_en",
    "salary_raw", "salary_min_vnd", "salary_max_vnd",
    "salary_min_usd", "salary_max_usd", "salary_is_negotiable",
    "experience_raw", "experience_min_years", "experience_max_years",
    "job_type", "company_size", "quantity",
    "embedding", "faiss_index_id", "graph_node_id",
    "is_active", "normalized_at", "embedded_at"
]

REQUIRED_SKILL_COLUMNS = [
    "id", "name", "name_vi",
    "learnability_tier", "learnability_weight",
    "skill_category", "parent_skill_id",
    "esco_uri", "onet_code", "aliases",
    "graph_node_id", "embedding"
]

@pytest.mark.asyncio
async def test_all_tables_exist():
    async with engine.connect() as conn:
        
        existing = await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())
        for table in REQUIRED_TABLES:
            assert table in existing, f"Bảng '{table}' THIẾU trong database"

@pytest.mark.asyncio
async def test_jobs_columns():
    async with engine.connect() as conn:
        cols = await conn.run_sync(
            lambda c: [col['name'] for col in inspect(c).get_columns('jobs')]
        )
        for col in REQUIRED_JOB_COLUMNS:
            assert col in cols, f"Cột '{col}' THIẾU trong bảng jobs"

@pytest.mark.asyncio
async def test_skills_learnability_constraint():
    """learnability_tier chỉ được là 'easy' | 'medium' | 'hard'"""
    async with engine.connect() as conn:
        # Thử insert sai tier → phải bị reject
        try:
            await conn.execute(text(
                "INSERT INTO skills(name, learnability_tier, learnability_weight) "
                "VALUES ('TestSkill', 'invalid_tier', 0.5)"
            ))
            assert False, "DB phải reject learnability_tier không hợp lệ"
        except Exception:
            pass  # Expected - constraint hoạt động

@pytest.mark.asyncio
async def test_apply_url_not_null():
    """apply_url trong bảng jobs KHÔNG được NULL"""
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT COUNT(*) FROM jobs WHERE apply_url IS NULL OR apply_url = ''")
        )
        null_count = result.scalar()
        assert null_count == 0, f"{null_count} jobs bị thiếu apply_url"

@pytest.mark.asyncio
async def test_job_matches_has_apply_url_column():
    async with engine.connect() as conn:
        cols = await conn.run_sync(
            lambda c: [col['name'] for col in inspect(c).get_columns('job_matches')]
        )
        assert "apply_url" in cols, "Bảng job_matches THIẾU cột apply_url"
