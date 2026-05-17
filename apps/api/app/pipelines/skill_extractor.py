import re
from sqlalchemy.future import select
from app.models.skill import Skill
from app.database import AsyncSessionLocal

class HybridSkillExtractor:
    """
    Extracts skills from text (jobs or CVs) using a rule-based + database matching approach.
    Matches against canonical skill names, Vietnamese aliases, and other listed aliases.
    Uses a custom boundary-aware regular expression supporting both English and Vietnamese characters.
    """
    def __init__(self, db_session=None):
        self.db_session = db_session
        self.skills_list = []
        self.skills_loaded = False

    async def _load_skills_if_needed(self):
        if self.skills_loaded:
            return
            
        if self.db_session:
            result = await self.db_session.execute(select(Skill))
            self.skills_list = result.scalars().all()
        else:
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(Skill))
                self.skills_list = result.scalars().all()
                
        self.skills_loaded = True

    async def extract_skills(self, text: str) -> list[Skill]:
        """
        Extracts matching skills from the text.
        """
        if not text or not isinstance(text, str):
            return []
            
        await self._load_skills_if_needed()
        
        text_lower = text.lower()
        matched_skills = []
        
        for skill in self.skills_list:
            candidates = []
            if skill.name:
                candidates.append(skill.name.lower())
            if skill.name_vi:
                candidates.append(skill.name_vi.lower())
            if skill.aliases:
                candidates.extend([alias.lower() for alias in skill.aliases if alias])
                
            found = False
            for candidate in candidates:
                if not candidate:
                    continue
                    
                escaped_candidate = re.escape(candidate)
                
                # Boundary-aware check for both English and Vietnamese unicode characters
                pattern = (
                    rf"(?:^|[^a-zA-Z0-9_đĐâÂăĂêÊôÔơƠưƯíÍúÚéÉáÁóÓýÝđĐăâêôơư])"
                    rf"{escaped_candidate}"
                    rf"(?:$|[^a-zA-Z0-9_đĐâÂăĂêÊôÔơƠưƯíÍúÚéÉáÁóÓýÝđĐăâêôơư])"
                )
                
                if re.search(pattern, text_lower):
                    found = True
                    break
                    
            if found:
                matched_skills.append(skill)
                
        return matched_skills
