import asyncio
import sys
import os
import uuid
import random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal
from sqlalchemy import text
from app.models.user import User
from app.models.job import Job, JobSkill, Company
from app.models.cv import CV, CVSkill
from app.models.cv import CV, CVSkill
from app.models.skill import Skill
from app.models.application import JobApplication
from app.services.auth_service import AuthService

async def seed_mock_data():
    async with AsyncSessionLocal() as session:
        # 1. Get or create Admin user
        result = await session.execute(text("SELECT id, company_id FROM users WHERE email = 'admin@graphhire.com'"))
        admin = result.fetchone()
        
        if not admin:
            print("Admin not found. Please run create_admin.py first.")
            return

        admin_id = admin[0]
        company_id = admin[1]

        # 2. Get or Create Company
        if not company_id:
            print("Creating mock company for Admin...")
            company = Company(
                name_vi="Tập đoàn Công nghệ TechGlobal",
                name_en="TechGlobal Corporation",
                industry="Technology",
                company_size="1000-5000"
            )
            session.add(company)
            await session.flush()
            company_id = company.id
            
            # Update Admin
            await session.execute(text(f"UPDATE users SET company_id = {company_id} WHERE id = {admin_id}"))
            await session.commit()
            print(f"Company created and assigned to Admin (Company ID: {company_id})")

        # 3. Create Skills if not exist
        skills = ['React', 'Node.js', 'Python', 'Machine Learning', 'Docker', 'AWS', 'TypeScript', 'PostgreSQL', 'MongoDB', 'Redis']
        skill_ids = []
        for s in skills:
            res = await session.execute(text(f"SELECT id FROM skills WHERE name = '{s}'"))
            row = res.fetchone()
            if not row:
                skill = Skill(name=s, name_vi=s)
                session.add(skill)
                await session.flush()
                skill_ids.append(skill.id)
            else:
                skill_ids.append(row[0])
        
        # 4. Create Jobs
        job_titles = [
            ("Senior Fullstack Developer", "Software Engineering"),
            ("AI/ML Research Engineer", "Artificial Intelligence"),
            ("DevOps Engineer", "Infrastructure")
        ]
        
        job_records = []
        for title, category in job_titles:
            job_id_str = f"JOB-{uuid.uuid4().hex[:8].upper()}"
            job = Job(
                job_id=job_id_str,
                apply_url=f"/jobs/{job_id_str}/apply",
                company_id=company_id,
                title_en=title,
                title_vi=title,
                job_category=category,
                is_active=True,
                company_name_en="TechGlobal Corporation"
            )
            session.add(job)
            await session.flush()
            job_records.append(job)
            
            # Add skills to job
            selected_skills = random.sample(skill_ids, k=4)
            for sid in selected_skills:
                session.add(JobSkill(job_id=job.id, skill_id=sid, is_required=True))
                
        # 5. Create Candidates and CVs
        candidate_names = [
            "Nguyen Van A", "Tran Thi B", "Le Van C", "Pham Thi D", 
            "Hoang Van E", "Vu Thi F", "Vo Van G", "Dang Thi H"
        ]
        
        cv_records = []
        for i, name in enumerate(candidate_names):
            # Create user
            email = f"candidate{i}@mock.com"
            res = await session.execute(text(f"SELECT id FROM users WHERE email = '{email}'"))
            row = res.fetchone()
            if not row:
                pw = AuthService.get_password_hash("mock123")
                user = User(email=email, hashed_password=pw, full_name=name, role="candidate")
                session.add(user)
                await session.flush()
                user_id = user.id
            else:
                user_id = row[0]
                
            # Create CV
            cv = CV(
                user_id=user_id,
                title_en=f"{name} - Software Engineer",
                experience_years=random.randint(1, 5),
                is_primary=True
            )
            session.add(cv)
            await session.flush()
            cv_records.append(cv)
            
            # Add CV skills
            cv_selected_skills = random.sample(skill_ids, k=random.randint(3, 6))
            for sid in cv_selected_skills:
                session.add(CVSkill(cv_id=cv.id, skill_id=sid, proficiency_level="intermediate", years_experience=2.0))

        # 6. Create Job Applications
        statuses = ['pending', 'reviewed', 'shortlisted', 'rejected']
        for job in job_records:
            # Randomly select some CVs to apply
            applicants = random.sample(cv_records, k=random.randint(3, 7))
            for cv in applicants:
                # Check if already applied
                res = await session.execute(text(f"SELECT id FROM job_applications WHERE job_id={job.id} AND cv_id={cv.id}"))
                if not res.fetchone():
                    app = JobApplication(
                        job_id=job.id,
                        cv_id=cv.id,
                        applicant_id=cv.user_id,
                        match_score=random.uniform(60, 95),
                        status=random.choice(statuses),
                        applied_at=datetime.utcnow() - timedelta(days=random.randint(0, 14))
                    )
                    session.add(app)
                    
        await session.commit()
        print("Successfully generated mock data for Admin dashboard!")

if __name__ == '__main__':
    asyncio.run(seed_mock_data())
