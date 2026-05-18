import asyncio
from pypdf import PdfReader
from sqlalchemy.future import select
from app.database import AsyncSessionLocal
from app.models.cv import CV, CVSkill
from app.models.user import User
from app.pipelines.skill_extractor import HybridSkillExtractor
from app.ml.embedding import SentenceTransformerEmbedding
from app.api.v1.matching import get_job_recommendations
from app.schemas.match import MatchRequest

async def main():
    pdf_path = "../../Bachelor of Science in Information Technology.pdf"
    
    # 1. Extract text from PDF
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
        
    print(f"Extracted {len(text)} characters from CV.")
    
    # 2. Extract skills
    async with AsyncSessionLocal() as db:
        extractor = HybridSkillExtractor(db_session=db)
        skills = await extractor.extract_skills(text)
        print(f"Extracted {len(skills)} skills: {[s.name for s in skills]}")
        
        # 3. Create or update CV for user 1 (assuming user 1 exists)
        user_id = 1
        user_res = await db.execute(select(User).filter(User.id == user_id))
        user = user_res.scalars().first()
        if not user:
            print("User 1 not found. Creating test user.")
            user = User(id=user_id, email="test@example.com", is_active=True, hashed_password="asd")
            db.add(user)
            await db.commit()
            
        cv_res = await db.execute(select(CV).filter(CV.user_id == user_id))
        cv = cv_res.scalars().first()
        if not cv:
            cv = CV(user_id=user_id, is_primary=True)
            db.add(cv)
            await db.commit()
            await db.refresh(cv)
            
        # Update CV
        cv.title_en = "Bachelor of Science in Information Technology"
        cv.summary_en = text[:500]
        cv.raw_text_en = text
        
        # Delete old skills
        await db.execute(select(CVSkill).filter(CVSkill.cv_id == cv.id))
        # simplistic deletion for test
        cv.skills = []
        await db.commit()
        
        for sk in skills:
            db_sk = CVSkill(cv_id=cv.id, skill_id=sk.id, proficiency_level="intermediate", years_experience=1.0)
            db.add(db_sk)
            
        # Embedding
        embedder = SentenceTransformerEmbedding()
        skill_names = " ".join([s.name for s in skills])
        embedding_text = f"{cv.title_en}. {cv.summary_en}. Skills: {skill_names}"
        cv.embedding = embedder.get_embedding(embedding_text)
        await db.commit()
        print(f"CV updated. Embedding generated.")
        
        # 4. Get matching scores
        req = MatchRequest(cv_id=cv.id, top_k=10)
        res = await get_job_recommendations(req, current_user=user, db=db)
        
        print("\n--- MATCHING RESULTS ---")
        for match in res.results[:5]:
            print(f"Job {match.job_id}: Score={match.scores.overall} (HGAT={match.scores.hgat_cosine}, Skills={match.scores.skill_match})")
        
if __name__ == "__main__":
    asyncio.run(main())
