from sqlalchemy import Column, Integer, String, Text, BigInteger, DECIMAL, Boolean, DateTime, ForeignKey, Float, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy import func
from app.database import Base

class Company(Base):
    __tablename__ = 'companies'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name_vi = Column(String(255))
    name_en = Column(String(255))
    industry = Column(String(100))
    company_size = Column(String(50))
    graph_node_id = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

    jobs = relationship("Job", back_populates="company")


class Location(Base):
    __tablename__ = 'locations'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name_vi = Column(String(100))
    name_en = Column(String(100))
    region = Column(String(50))
    graph_node_id = Column(Integer)


class Job(Base):
    __tablename__ = 'jobs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(50), unique=True, nullable=False, index=True)
    apply_url = Column(String(1000), nullable=False, index=True)
    
    # Bilingual content
    title_vi = Column(Text)
    title_en = Column(Text)
    company_name_vi = Column(Text)
    company_name_en = Column(Text)
    job_address = Column(String(255), index=True)
    job_address_detail = Column(Text)
    job_requirements_vi = Column(Text)
    job_requirements_en = Column(Text)
    job_description_vi = Column(Text)
    job_description_en = Column(Text)
    benefit_vi = Column(Text)
    benefit_en = Column(Text)
    
    # Normalized salary
    salary_raw = Column(String(255))
    salary_min_vnd = Column(BigInteger, index=True)
    salary_max_vnd = Column(BigInteger, index=True)
    salary_min_usd = Column(DECIMAL(10, 2))
    salary_max_usd = Column(DECIMAL(10, 2))
    salary_is_negotiable = Column(Boolean, default=False)
    salary_currency = Column(String(10), default='VND')
    
    # Normalized experience
    experience_raw = Column(String(100))
    experience_min_years = Column(DECIMAL(4, 1), index=True)
    experience_max_years = Column(DECIMAL(4, 1), index=True)
    
    # Job metadata
    job_type = Column(String(100))
    company_size = Column(String(100))
    quantity = Column(Integer)
    job_category = Column(String(100))
    
    # Graph/ML fields
    embedding = Column(ARRAY(Float))
    faiss_index_id = Column(Integer)
    graph_node_id = Column(Integer)
    
    # Lifecycle
    is_active = Column(Boolean, default=True, index=True)
    normalized_at = Column(DateTime)
    embedded_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    company_id = Column(Integer, ForeignKey('companies.id'))
    company = relationship("Company", back_populates="jobs")

    skills = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
    matches = relationship("JobMatch", back_populates="job", cascade="all, delete-orphan")
    apply_clicks = relationship("ApplyClick", back_populates="job", cascade="all, delete-orphan")


class JobSkill(Base):
    __tablename__ = 'job_skills'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False)
    skill_id = Column(Integer, ForeignKey('skills.id'), nullable=False)
    is_required = Column(Boolean, default=True)
    importance_rank = Column(Integer)
    extracted_by = Column(String(20), default='nlp')

    __table_args__ = (
        UniqueConstraint('job_id', 'skill_id', name='idx_job_skills_unique'),
    )

    job = relationship("Job", back_populates="skills")
    skill = relationship("Skill")


class JobSimilarity(Base):
    __tablename__ = 'job_similarity'
    
    job_id_a = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), primary_key=True)
    job_id_b = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), primary_key=True)
    jaccard_score = Column(DECIMAL(5, 4))


class ApplyClick(Base):
    __tablename__ = 'apply_clicks'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'))
    cv_id = Column(Integer, ForeignKey('cvs.id'))
    apply_url = Column(String(1000))
    clicked_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="apply_clicks")
    job = relationship("Job", back_populates="apply_clicks")
    cv = relationship("CV", back_populates="apply_clicks")
