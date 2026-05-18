import pytest
import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine

BASE_URL = "http://localhost:8000"

@pytest.fixture(scope="module")
async def auth_token():
    async with httpx.AsyncClient() as client:
        # Register (body is JSON)
        await client.post(f"{BASE_URL}/api/v1/auth/register", json={
            "email": "matcher@test.com", "password": "Test123!", "full_name": "Matcher"
        }, timeout=30.0)
        # Login (OAuth2PasswordRequestForm expects form data)
        resp = await client.post(f"{BASE_URL}/api/v1/auth/login", data={
            "username": "matcher@test.com", "password": "Test123!"
        }, timeout=30.0)
        assert resp.status_code == 200, f"Login failed with status {resp.status_code}: {resp.text}"
        return resp.json()["access_token"]

@pytest.fixture(scope="module")
async def test_cv_id(auth_token):
    """Tạo 1 CV test với skills"""
    async with AsyncSession(engine) as session:
        # Get valid skill IDs from DB
        res = await session.execute(text("SELECT id, name FROM skills LIMIT 3"))
        db_skills = res.all()
        
    skills_payload = []
    if db_skills:
        for skill in db_skills:
            skills_payload.append({
                "skill_id": skill.id,
                "proficiency_level": "intermediate",
                "years_experience": 1.5
            })
    else:
        # Fallback if no skills exist
        skills_payload = [{"skill_id": 1, "proficiency_level": "intermediate", "years_experience": 1.5}]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/api/v1/cvs/",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title_en": "Junior Backend Developer",
                "summary_en": "Python developer with 2 years experience",
                "experience_years": 2.0,
                "expected_salary_min_vnd": 15000000,
                "expected_salary_max_vnd": 25000000,
                "preferred_locations": ["Hồ Chí Minh"],
                "skills": skills_payload
            },
            timeout=30.0
        )
        assert resp.status_code == 201, f"Create CV failed with status {resp.status_code}: {resp.text}"
        return resp.json()["id"]
