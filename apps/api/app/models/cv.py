from sqlalchemy import Column, Integer, String, Text, BigInteger, DECIMAL, Boolean, DateTime, ForeignKey, Float, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class CV(Base):
    __tablename__ = 'cvs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title_en = Column(String(255))
    summary_en = Column(Text)
    
    # Normalized fields
    experience_years = Column(DECIMAL(4, 1))
    current_salary_vnd = Column(BigInteger)
    expected_salary_min_vnd = Column(BigInteger)
    expected_salary_max_vnd = Column(BigInteger)
    preferred_locations = Column(ARRAY(Text))
    preferred_job_types = Column(ARRAY(Text))
    
    # Raw content
    raw_text_vi = Column(Text)
    raw_text_en = Column(Text)
    
    # Graph/ML fields
    embedding = Column(ARRAY(Float))
    faiss_index_id = Column(Integer)
    
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="cvs")
    skills = relationship("CVSkill", back_populates="cv", cascade="all, delete-orphan")
    matches = relationship("JobMatch", back_populates="cv", cascade="all, delete-orphan")
    apply_clicks = relationship("ApplyClick", back_populates="cv", cascade="all, delete-orphan")


class CVSkill(Base):
    __tablename__ = 'cv_skills'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    cv_id = Column(Integer, ForeignKey('cvs.id', ondelete='CASCADE'), nullable=False)
    skill_id = Column(Integer, ForeignKey('skills.id'), nullable=False)
    proficiency_level = Column(String(20)) # beginner | intermediate | advanced | expert
    years_experience = Column(DECIMAL(4, 1))
    is_self_assessed = Column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint('cv_id', 'skill_id', name='idx_cv_skills_unique'),
    )

    cv = relationship("CV", back_populates="skills")
    skill = relationship("Skill")
