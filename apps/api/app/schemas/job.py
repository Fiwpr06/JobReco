from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.schemas.skill import SkillResponse

class CompanyResponse(BaseModel):
    id: int
    name_vi: Optional[str] = None
    name_en: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class JobSkillResponse(BaseModel):
    id: int
    job_id: int
    skill_id: int
    is_required: bool
    importance_rank: Optional[int] = None
    skill: Optional[SkillResponse] = None

    model_config = ConfigDict(from_attributes=True)

class JobResponse(BaseModel):
    id: int
    job_id: str
    apply_url: str  # All match and job detailed responses must return apply_url
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    company_name_vi: Optional[str] = None
    company_name_en: Optional[str] = None
    job_address: Optional[str] = None
    job_address_detail: Optional[str] = None
    job_requirements_vi: Optional[str] = None
    job_requirements_en: Optional[str] = None
    job_description_vi: Optional[str] = None
    job_description_en: Optional[str] = None
    benefit_vi: Optional[str] = None
    benefit_en: Optional[str] = None
    
    # Salary
    salary_raw: Optional[str] = None
    salary_min_vnd: Optional[int] = None
    salary_max_vnd: Optional[int] = None
    salary_min_usd: Optional[float] = None
    salary_max_usd: Optional[float] = None
    salary_is_negotiable: bool = False
    salary_currency: str = "VND"

    # Experience
    experience_raw: Optional[str] = None
    experience_min_years: Optional[float] = None
    experience_max_years: Optional[float] = None

    # Metadata
    job_type: Optional[str] = None
    company_size: Optional[str] = None
    quantity: Optional[int] = None
    job_category: Optional[str] = None

    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    company: Optional[CompanyResponse] = None
    skills: List[JobSkillResponse] = []

    model_config = ConfigDict(from_attributes=True)
