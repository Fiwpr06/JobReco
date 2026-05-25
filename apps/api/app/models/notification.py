from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy import func
from app.database import Base

class Notification(Base):
    __tablename__ = 'notifications'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # E.g. 'application_status', 'system_alert', 'new_message'
    type = Column(String(50), nullable=False, default='system_alert')
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Optional context (e.g. link to job or application)
    link = Column(String(1000), nullable=True)
    
    is_read = Column(Boolean, default=False, index=True)
    
    created_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User")
