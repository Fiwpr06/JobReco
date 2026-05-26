from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ChatMessageBase(BaseModel):
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    id: int
    room_id: int
    sender_id: int
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ChatRoomResponse(BaseModel):
    id: int
    job_id: int
    candidate_id: int
    recruiter_id: int
    created_at: datetime
    updated_at: datetime
    
    # Optional nested data for UI
    job_title: Optional[str] = None
    candidate_name: Optional[str] = None
    recruiter_name: Optional[str] = None
    last_message: Optional[str] = None
    unread_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)
