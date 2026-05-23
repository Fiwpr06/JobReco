from sqlalchemy import Column, Integer, String, Text, DECIMAL, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy import func
from app.database import Base

class Skill(Base):
    __tablename__ = 'skills'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    name_vi = Column(String(255))
    
    # 'easy' | 'medium' | 'hard'
    learnability_tier = Column(String(10), nullable=False)
    # ω(s) weight: 0.1 | 0.3 | 0.7
    learnability_weight = Column(DECIMAL(3, 2), nullable=False)
    
    skill_category = Column(String(50)) # 'tool' | 'framework' | 'language' | 'domain' | 'soft'
    parent_skill_id = Column(Integer, ForeignKey('skills.id'), nullable=True)
    esco_uri = Column(String(500))
    onet_code = Column(String(50))
    aliases = Column(ARRAY(Text))
    
    graph_node_id = Column(Integer)
    embedding = Column(ARRAY(Float))
    
    created_at = Column(DateTime, server_default=func.now())

    parent = relationship("Skill", remote_side=[id], backref="child_skills")
