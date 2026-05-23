from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy import func
from app.database import Base

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(20), default='candidate')
    subscription_tier = Column(String(20), default='free')
    premium_until = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    company_id = Column(Integer, ForeignKey('companies.id'), nullable=True)
    
    company = relationship("Company")
    cvs = relationship("CV", back_populates="user", cascade="all, delete-orphan")
    apply_clicks = relationship("ApplyClick", back_populates="user")
    search_logs = relationship("SearchLog", back_populates="user", cascade="all, delete-orphan")
    job_applications = relationship("JobApplication", back_populates="applicant", cascade="all, delete-orphan")


class SearchLog(Base):
    __tablename__ = 'search_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    query_text = Column(Text)
    filters = Column(JSONB)
    result_count = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="search_logs")
