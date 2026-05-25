from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy import func
from app.database import Base

class JobApplication(Base):
    __tablename__ = 'job_applications'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False, index=True)
    cv_id = Column(Integer, ForeignKey('cvs.id', ondelete='CASCADE'), nullable=True, index=True)
    applicant_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Snapshot of the CV uploaded for this specific application
    cv_url = Column(String(1000))
    cv_public_id = Column(String(255))
    
    status = Column(String(20), default='pending')  # 'pending', 'reviewed', 'shortlisted', 'rejected', 'hired'
    match_score = Column(Float, nullable=True)
    manual_rank = Column(Integer, nullable=True)     # To persist drag-and-drop overrides
    ai_explanation = Column(JSONB, nullable=True)
    applied_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    job = relationship("Job")
    cv = relationship("CV")
    applicant = relationship("User", back_populates="job_applications")


class RecruiterAction(Base):
    __tablename__ = 'recruiter_actions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    recruiter_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey('job_applications.id', ondelete='CASCADE'), nullable=False, index=True)
    action_type = Column(String(50), nullable=False) # 'view', 'shortlist', 'reject', 'hire'
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    recruiter = relationship("User")
    application = relationship("JobApplication")
