from sqlalchemy import Column, Integer, String, Text, DECIMAL, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class JobMatch(Base):
    __tablename__ = 'job_matches'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    cv_id = Column(Integer, ForeignKey('cvs.id', ondelete='CASCADE'), nullable=False)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False)
    
    # Cosine similarity score từ HGAT: score(c,j) = cos(c', h_j)
    hgat_score = Column(DECIMAL(7, 6))
    
    # Breakdown scores
    skill_match_score = Column(DECIMAL(5, 4))
    experience_match_score = Column(DECIMAL(5, 4))
    salary_match_score = Column(DECIMAL(5, 4))
    location_match_score = Column(DECIMAL(5, 4))
    overall_score = Column(DECIMAL(5, 4))
    
    # SLWG Analysis
    slwg_total_penalty = Column(DECIMAL(5, 4))
    skill_gap_analysis = Column(JSONB)
    
    explanation = Column(Text)
    apply_url = Column(String(1000))
    rank_position = Column(Integer)
    model_version = Column(String(20), default='hgat-v1')
    computed_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('cv_id', 'job_id', name='idx_cv_job_match_unique'),
    )

    cv = relationship("CV", back_populates="matches")
    job = relationship("Job", back_populates="matches")
