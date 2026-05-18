import pytest
import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine

BASE_URL = "http://localhost:8000"

@pytest.mark.asyncio
async def test_cv_to_jobs_returns_apply_url(auth_token, test_cv_id):
    """CRITICAL: Mọi kết quả matching PHẢI có apply_url"""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/api/v1/matching/cv-to-jobs",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"cv_id": test_cv_id, "top_k": 10}
        )
        assert resp.status_code == 200
        data = resp.json()
        results = data["results"]
        assert len(results) > 0, "Matching không trả về kết quả nào"

        for i, result in enumerate(results):
            assert "apply_url" in result, \
                f"Result #{i+1} THIẾU apply_url"
            assert result["apply_url"].startswith("http"), \
                f"apply_url không hợp lệ: {result['apply_url']}"

@pytest.mark.asyncio
async def test_cv_to_jobs_response_structure(auth_token, test_cv_id):
    """Kiểm tra toàn bộ cấu trúc response theo spec"""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/api/v1/matching/cv-to-jobs",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"cv_id": test_cv_id, "top_k": 5}
        )
        data = resp.json()

        # Top-level fields
        assert "cv_id" in data
        assert "model_version" in data
        assert "computed_at" in data
        assert "results" in data
        assert "total_candidates_evaluated" in data
        assert data["total_candidates_evaluated"] <= 50  # FAISS top-50

        # Per-result fields
        result = data["results"][0]
        required_fields = [
            "rank", "job_id", "title_en", "title_vi",
            "company_name", "job_address",
            "salary_display", "salary_min_vnd", "salary_max_vnd",
            "job_type", "apply_url", "scores", "skill_analysis", "explanation"
        ]
        for field in required_fields:
            assert field in result, f"Result thiếu field '{field}'"

        # Scores structure
        scores = result["scores"]
        assert "hgat_cosine" in scores or "overall" in scores
        assert "skill_match" in scores
        assert "slwg_total_penalty" in scores

        # skill_analysis structure
        analysis = result["skill_analysis"]
        assert "matched_skills" in analysis
        assert "missing_required" in analysis
        assert "missing_preferred" in analysis

        # SLWG gap items phải có đủ fields
        for gap in analysis["missing_required"]:
            assert "skill" in gap
            assert "tier" in gap and gap["tier"] in ["easy", "medium", "hard"]
            assert "omega" in gap
            assert "slwg_penalty" in gap
            assert "suggestion" in gap

@pytest.mark.asyncio
async def test_matching_scores_in_range(auth_token, test_cv_id):
    """Scores phải trong khoảng [0, 1]"""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/api/v1/matching/cv-to-jobs",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"cv_id": test_cv_id, "top_k": 10}
        )
        results = resp.json()["results"]
        for r in results:
            scores = r["scores"]
            for score_name, score_val in scores.items():
                if isinstance(score_val, (int, float)):
                    assert 0.0 <= score_val <= 1.0 or score_name == "slwg_total_penalty", \
                        f"Score '{score_name}' = {score_val} nằm ngoài [0,1]"

@pytest.mark.asyncio
async def test_matching_results_ranked_descending(auth_token, test_cv_id):
    """Kết quả phải được sort theo score giảm dần"""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/api/v1/matching/cv-to-jobs",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"cv_id": test_cv_id, "top_k": 10}
        )
        results = resp.json()["results"]
        scores = [r["scores"]["overall"] for r in results if "overall" in r["scores"]]
        assert scores == sorted(scores, reverse=True), \
            "Kết quả chưa được sort theo score giảm dần"

@pytest.mark.asyncio
async def test_matching_redis_cache(auth_token):
    """Lần gọi thứ 2 phải nhanh hơn (từ cache)"""
    import time
    
    async with AsyncSession(engine) as session:
        res = await session.execute(text("SELECT id FROM skills LIMIT 3"))
        db_skills = res.all()
        
    skills_payload = [{"skill_id": s[0], "proficiency_level": "intermediate", "years_experience": 1.5} for s in db_skills]
    if not skills_payload:
        skills_payload = [{"skill_id": 1, "proficiency_level": "intermediate", "years_experience": 1.5}]
        
    async with httpx.AsyncClient() as client:
        # POST tạo CV mới tinh để đảm bảo chưa có cache
        cv_resp = await client.post(
            f"{BASE_URL}/api/v1/cvs/",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title_en": "Unique Cache Test Developer",
                "summary_en": "Unique Python developer for cache testing",
                "experience_years": 3.0,
                "expected_salary_min_vnd": 20000000,
                "expected_salary_max_vnd": 30000000,
                "preferred_locations": ["Hà Nội"],
                "skills": skills_payload
            },
            timeout=30.0
        )
        assert cv_resp.status_code == 201, f"Failed to create CV: {cv_resp.text}"
        new_cv_id = cv_resp.json()["id"]

        # First call (Cache MISS)
        t0 = time.time()
        await client.post(
            f"{BASE_URL}/api/v1/matching/cv-to-jobs",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"cv_id": new_cv_id, "top_k": 10}
        )
        first_latency = time.time() - t0

        # Second call (should hit cache)
        t0 = time.time()
        resp2 = await client.post(
            f"{BASE_URL}/api/v1/matching/cv-to-jobs",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"cv_id": new_cv_id, "top_k": 10}
        )
        second_latency = time.time() - t0

        assert resp2.status_code == 200
        # Cache phải nhanh hơn ít nhất 50%
        assert second_latency < first_latency * 0.5, \
            f"Cache không hiệu quả: lần 1={first_latency:.2f}s, lần 2={second_latency:.2f}s"

@pytest.mark.asyncio
async def test_apply_click_endpoint(auth_token):
    """Track click nộp đơn → trả apply_url"""
    async with AsyncSession(engine) as session:
        res = await session.execute(text("SELECT id FROM jobs LIMIT 1"))
        job_id = res.scalar()
        if not job_id:
            job_id = 2002962

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/api/v1/jobs/{job_id}/apply-click",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=30.0
        )
        assert resp.status_code == 200, f"Failed with {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "apply_url" in data
        assert data["apply_url"].startswith("http")
        assert data.get("tracked") is True

        # Verify click được lưu vào DB
        async with AsyncSession(engine) as session:
            result = await session.execute(
                text(f"SELECT COUNT(*) FROM apply_clicks WHERE job_id = {job_id}")
            )
            assert result.scalar() >= 1
