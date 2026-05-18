import asyncio
import os
import sys
import uuid
import httpx
from loguru import logger

# Force utf-8 output encoding for Windows terminal compatibility
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.config import settings

async def run_smoke_tests():
    logger.info("Initializing Integration API Smoke Tests...")
    
    # We use httpx.AsyncClient directly against the FastAPI app instance
    # This executes the async endpoints natively in our current event loop
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        
        # 1. Test Health Endpoint
        logger.info("1. Testing Health check...")
        res_health = await client.get("/api/v1/health")
        assert res_health.status_code == 200, f"Health check failed: {res_health.text}"
        logger.info(f"Health response: {res_health.json()}")

        # 2. Register Candidate User
        logger.info("2. Registering candidate user...")
        test_email = f"candidate_smoke_{uuid.uuid4().hex[:6]}@matching.ai"
        register_payload = {
            "email": test_email,
            "password": "Password123!",
            "full_name": "Smoke Test Candidate",
            "role": "candidate"
        }
        res_register = await client.post("/api/v1/auth/register", json=register_payload)
        assert res_register.status_code == 201, f"Registration failed: {res_register.text}"
        user_data = res_register.json()
        logger.info(f"Registered User successfully: {user_data['email']}")

        # 3. Log in Candidate User
        logger.info("3. Logging in candidate user...")
        login_payload = {
            "username": test_email,
            "password": "Password123!"
        }
        # OAuth2PasswordRequestForm expects form-data
        res_login = await client.post("/api/v1/auth/login", data=login_payload)
        assert res_login.status_code == 200, f"Login failed: {res_login.text}"
        token_data = res_login.json()
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        logger.info("Login successful. Access token acquired.")

        # 4. Upload raw Vietnamese CV to test auto-parsing, translation & normalizations
        logger.info("4. Uploading raw Vietnamese CV for parsing...")
        cv_payload = {
            "raw_text_vi": (
                "Tôi là một lập trình viên Python và SQL có 3 năm kinh nghiệm. "
                "Có khả năng thiết kế cơ sở dữ liệu và xây dựng API. "
                "Mức lương kỳ vọng từ 25 triệu VND đến 30 triệu VND tại Hà Nội."
            ),
            "preferred_locations": ["Hà Nội"],
            "preferred_job_types": ["Full-time"]
        }
        res_cv_create = await client.post("/api/v1/cvs/", json=cv_payload, headers=headers)
        assert res_cv_create.status_code == 201, f"CV Creation failed: {res_cv_create.text}"
        cv_data = res_cv_create.json()
        
        logger.info("CV Created & Parsed Successfully!")
        logger.info(f" - Title (Auto-extracted): {cv_data['title_en']}")
        logger.info(f" - English translation: {cv_data['summary_en']}")
        logger.info(f" - Experience (Normalized): {cv_data['experience_years']} years")
        logger.info(f" - Expected salary min: {cv_data['expected_salary_min_vnd']} VND")
        logger.info(f" - Expected salary max: {cv_data['expected_salary_max_vnd']} VND")
        logger.info(f" - Primary: {cv_data['is_primary']}")
        logger.info(f" - Skills extracted: {[s['skill']['name'] for s in cv_data['skills']]}")
        
        cv_id = cv_data["id"]

        # 5. Fetch Primary CV
        logger.info("5. Fetching primary CV...")
        res_primary = await client.get("/api/v1/cvs/primary", headers=headers)
        assert res_primary.status_code == 200
        assert res_primary.json()["id"] == cv_id
        logger.info("Primary CV retrieved successfully.")

        # 6. Retrieve AI Matching recommendations
        logger.info("6. Retrieving GNN AI Matching recommendations...")
        match_payload = {
            "cv_id": cv_id,
            "top_k": 5
        }
        res_matching = await client.post("/api/v1/matching/", json=match_payload, headers=headers)
        assert res_matching.status_code == 200, f"Matching failed: {res_matching.text}"
        matches = res_matching.json()
        logger.info(f"Retrieved {len(matches)} recommended jobs.")
        
        # Validate match data structure
        for idx, match in enumerate(matches):
            logger.info(f"\n[Rank #{match['rank_position']}] Job: {match['job']['title_en'] or match['job']['title_vi']}")
            logger.info(f" - Company: {match['job']['company_name_en']}")
            logger.info(f" - Overall Suitability Score: {match['overall_score']:.2%}")
            logger.info(f" - HGAT GNN Score: {match['hgat_score']:.4f}")
            logger.info(f" - Skill Match Score: {match['skill_match_score']:.2%}")
            logger.info(f" - Experience Alignment: {match['experience_match_score']:.2%}")
            logger.info(f" - Salary Compatibility: {match['salary_match_score']:.2%}")
            logger.info(f" - SLWG Penalty: {match['slwg_total_penalty']:.4f}")
            logger.info(f" - Redirect apply target: {match['apply_url']}")
            
            gap_analysis = match["skill_gap_analysis"]
            logger.info(f" - Matching Skills: {gap_analysis['matching_skills']}")
            
            missing_reqs = [s["skill_name"] for s in gap_analysis["missing_required_skills"]]
            logger.info(f" - Missing Required Skills: {missing_reqs}")
            
            missing_prefs = [s["skill_name"] for s in gap_analysis["missing_preferred_skills"]]
            logger.info(f" - Missing Preferred Skills: {missing_prefs}")
            
            logger.info(f" - Advisory Explanation: {match['explanation']}")
            
            # Verify required structure is consistently returned
            assert "apply_url" in match, "Missing apply_url redirect link!"
            assert match["job"] is not None, "Job nested object must be populated!"
            assert match["job"]["apply_url"] is not None, "Job detailed response must return original apply_url!"

        # 7. Test redirect apply track link
        logger.info("\n7. Testing apply tracking redirect endpoint...")
        first_match = matches[0]
        job_id = first_match["job_id"]
        redirect_url = f"/api/v1/jobs/{job_id}/apply?cv_id={cv_id}"
        
        # Test request (FastAPI responses will follow, but we can prevent automatic redirect to capture the 307 status)
        res_redirect = await client.get(redirect_url, headers=headers, follow_redirects=False)
        assert res_redirect.status_code == 307 or res_redirect.status_code == 302, f"Expected 307 Redirect, got: {res_redirect.status_code}"
        logger.info(f"Redirect status code verified: {res_redirect.status_code}")
        logger.info(f"Location header redirect: {res_redirect.headers.get('location')}")
        assert res_redirect.headers.get("location") == first_match["job"]["apply_url"], "Redirect target does not match job original apply_url!"

        # 8. Test Skill Trends
        logger.info("\n8. Testing Skill Demand Trends...")
        res_trends = await client.get("/api/v1/skills/trends?limit=5", headers=headers)
        assert res_trends.status_code == 200
        trends = res_trends.json()
        logger.info("Market Demand Trends:")
        for idx, t in enumerate(trends):
            logger.info(f" - #{idx+1} {t['name']} (Category: {t['learnability_tier']}): Active job postings={t['job_count']} | Growth rate={t['growth_rate']}%")

        # 9. Test Skill Gaps Career advisory
        logger.info("\n9. Testing Career Gaps Advisory...")
        res_gaps = await client.get(f"/api/v1/skills/gaps?cv_id={cv_id}&limit=3", headers=headers)
        assert res_gaps.status_code == 200
        gaps_advisory = res_gaps.json()
        logger.info(f"Summary Advice: {gaps_advisory['recommendation_summary']}")
        for card in gaps_advisory["high_priority_gaps"]:
            logger.info(f" - Missing: {card['name']} (Learnability weight={card['learnability_weight']})")
            logger.info(f"   Market lockout: locked out of {card['percentage_jobs_unlocked_if_learned']}% of positions")
            logger.info(f"   Advisory action: {card['action_plan']}")

        logger.info("\n=======================================================")
        logger.info("INTEGRATION API SMOKE TEST RUN COMPLETED SUCCESSFULLY!")
        logger.info("=======================================================")

if __name__ == "__main__":
    asyncio.run(run_smoke_tests())
