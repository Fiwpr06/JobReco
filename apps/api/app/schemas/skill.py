from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class SkillBase(BaseModel):
    name: str
    name_vi: Optional[str] = None
    learnability_tier: str  # easy | medium | hard
    learnability_weight: float  # 0.1 | 0.3 | 0.7
    skill_category: Optional[str] = None  # tool | framework | language | domain | soft

class SkillCreate(SkillBase):
    esco_uri: Optional[str] = None
    onet_code: Optional[str] = None
    aliases: Optional[List[str]] = None

class SkillResponse(SkillBase):
    id: int
    esco_uri: Optional[str] = None
    onet_code: Optional[str] = None
    aliases: Optional[List[str]] = None
    graph_node_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class SkillTrendResponse(BaseModel):
    skill_id: int
    name: str
    name_vi: Optional[str] = None
    learnability_tier: str
    learnability_weight: float
    job_count: int
    growth_rate: float
