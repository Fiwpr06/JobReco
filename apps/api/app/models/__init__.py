from app.database import Base
from app.models.job import Job, JobSkill, JobSimilarity, Company, Location, ApplyClick
from app.models.user import User, SearchLog
from app.models.cv import CV, CVSkill
from app.models.skill import Skill
from app.models.match import JobMatch

__all__ = [
    "Base",
    "Job",
    "JobSkill",
    "JobSimilarity",
    "Company",
    "Location",
    "ApplyClick",
    "User",
    "SearchLog",
    "CV",
    "CVSkill",
    "Skill",
    "JobMatch",
]
