from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    link: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
