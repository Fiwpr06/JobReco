from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, List, Any
from datetime import datetime
from app.schemas.job import JobResponse

class SkillGapDetail(BaseModel):
    skill_name: str
    learnability_tier: str  # easy | medium | hard
    learnability_weight: float  # 0.1 | 0.3 | 0.7
    penalty_applied: float
    is_required: bool

class SkillGapAnalysis(BaseModel):
    missing_required_skills: List[SkillGapDetail] = []
    missing_preferred_skills: List[SkillGapDetail] = []
    matching_skills: List[str] = []
    slwg_total_penalty: float = 0.0

class JobMatchResponse(BaseModel):
    id: int
    cv_id: int
    job_id: int
    hgat_score: float
    skill_match_score: float
    experience_match_score: float
    salary_match_score: float
    location_match_score: float
    overall_score: float
    slwg_total_penalty: float
    skill_gap_analysis: Optional[SkillGapAnalysis] = None
    explanation: Optional[str] = None
    apply_url: str  # redirect apply target
    rank_position: Optional[int] = None
    model_version: str = "hgat-v1"
    computed_at: datetime
    
    # Nested job details for detailed recommendation rendering
    job: Optional[JobResponse] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class MatchRequest(BaseModel):
    # [CRIT-2 FIX] cv_id must be Optional so the fallback to the user's primary CV
    # in matching.py is reachable.  Previously declared as `int` (non-optional),
    # the else-branch in the endpoint was unreachable dead code.
    cv_id: Optional[int] = None
    top_k: Optional[int] = 10


class MatchResultScores(BaseModel):
    overall: float
    skill_match: float
    slwg_total_penalty: float
    hgat_cosine: float
    experience_match: float
    salary_match: float
    location_match: float

class SkillGapDetailTest(BaseModel):
    skill: str
    tier: str  # easy | medium | hard
    omega: float
    slwg_penalty: float
    suggestion: str

class SkillGapAnalysisTest(BaseModel):
    matched_skills: List[str] = []
    missing_required: List[SkillGapDetailTest] = []
    missing_preferred: List[SkillGapDetailTest] = []

class MatchResultItem(BaseModel):
    rank: int
    job_id: int
    title_en: Optional[str] = None
    title_vi: Optional[str] = None
    company_name: Optional[str] = None
    job_address: Optional[str] = None
    salary_display: Optional[str] = None
    salary_min_vnd: Optional[float] = None
    salary_max_vnd: Optional[float] = None
    job_type: Optional[str] = None
    apply_url: str
    scores: MatchResultScores
    skill_analysis: SkillGapAnalysisTest
    explanation: str

class MatchAPIResponse(BaseModel):
    cv_id: int
    model_version: str = "hgat_v1"
    computed_at: datetime
    total_candidates_evaluated: int
    results: List[MatchResultItem]

    model_config = ConfigDict(protected_namespaces=())

