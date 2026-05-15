from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.schemas.skill import SkillResponse

class CVSkillBase(BaseModel):
    skill_id: int
    proficiency_level: Optional[str] = "intermediate"  # beginner | intermediate | advanced | expert
    years_experience: Optional[float] = 1.0

class CVSkillCreate(CVSkillBase):
    pass

class CVSkillResponse(CVSkillBase):
    id: int
    cv_id: int
    skill: Optional[SkillResponse] = None

    model_config = ConfigDict(from_attributes=True)

class CVBase(BaseModel):
    title_en: Optional[str] = None
    summary_en: Optional[str] = None
    experience_years: Optional[float] = 0.0
    current_salary_vnd: Optional[int] = None
    expected_salary_min_vnd: Optional[int] = None
    expected_salary_max_vnd: Optional[int] = None
    preferred_locations: Optional[List[str]] = None
    preferred_job_types: Optional[List[str]] = None

class CVCreate(CVBase):
    raw_text_vi: Optional[str] = None
    raw_text_en: Optional[str] = None
    skills: Optional[List[CVSkillCreate]] = None

class CVUpdate(BaseModel):
    title_en: Optional[str] = None
    summary_en: Optional[str] = None
    experience_years: Optional[float] = None
    current_salary_vnd: Optional[int] = None
    expected_salary_min_vnd: Optional[int] = None
    expected_salary_max_vnd: Optional[int] = None
    preferred_locations: Optional[List[str]] = None
    preferred_job_types: Optional[List[str]] = None
    skills: Optional[List[CVSkillCreate]] = None

class CVResponse(CVBase):
    id: int
    user_id: int
    is_primary: bool
    created_at: datetime
    updated_at: datetime
    skills: List[CVSkillResponse] = []

    model_config = ConfigDict(from_attributes=True)
