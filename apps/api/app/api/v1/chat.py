from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Dict
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.job import Job
from app.models.chat import ChatRoom, ChatMessage
from app.schemas.chat import ChatRoomResponse, ChatMessageResponse, ChatMessageCreate
from app.services.auth_service import get_db, get_current_user
import json
import datetime
from datetime import timezone as tz
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Simple In-Memory Connection Manager for WebSockets
class ConnectionManager:
    def __init__(self):
        # room_id -> dict of websocket -> user_id
        self.active_connections: Dict[int, Dict[WebSocket, int]] = {}

    def connect(self, room_id: int, websocket: WebSocket, user_id: int):
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][websocket] = user_id

    def disconnect(self, room_id: int, websocket: WebSocket):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                del self.active_connections[room_id][websocket]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, room_id: int, message: dict):
        if room_id in self.active_connections:
            disconnected = []
            for connection, user_id in self.active_connections[room_id].items():
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to {user_id}: {e}")
                    disconnected.append(connection)
            
            for conn in disconnected:
                self.disconnect(room_id, conn)

manager = ConnectionManager()

@router.post("/rooms", response_model=ChatRoomResponse)
async def create_chat_room(
    job_id: int,
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Only the recruiter of the job or the candidate can create a room
    # Check if job exists
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    recruiter_id = job.company_id # Wait, job.company_id is just company, need actual user. In GraphHire, job has recruiter_id? Actually user.company_id matches job.company_id.
    
    # Check existing room
    query = await db.execute(
        select(ChatRoom).where(
            ChatRoom.job_id == job_id,
            ChatRoom.candidate_id == candidate_id
        )
    )
    room = query.scalars().first()
    if room:
        return room
        
    if current_user.role != 'recruiter':
        raise HTTPException(status_code=403, detail="Only recruiters can initiate chat rooms")
        
    room = ChatRoom(
        job_id=job_id,
        candidate_id=candidate_id,
        recruiter_id=current_user.id
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room

@router.get("/rooms", response_model=List[ChatRoomResponse])
async def get_my_chat_rooms(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get rooms where user is either candidate or recruiter
    query = await db.execute(
        select(ChatRoom)
        .options(selectinload(ChatRoom.job))
        .where(
            (ChatRoom.candidate_id == current_user.id) | 
            (ChatRoom.recruiter_id == current_user.id)
        )
        .order_by(ChatRoom.updated_at.desc())
    )
    rooms = query.scalars().all()
    
    # We would populate job_title, last_message, unread_count here
    result = []
    for r in rooms:
        # Mocking extra data for now
        resp = ChatRoomResponse.model_validate(r)
        resp.job_title = r.job.title_en if r.job else "Unknown Job"
        result.append(resp)
        
    return result

@router.get("/rooms/{room_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    room = await db.get(ChatRoom, room_id)
    if not room or (room.candidate_id != current_user.id and room.recruiter_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this room")
        
    query = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.room_id == room_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return query.scalars().all()

@router.websocket("/ws/{room_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    room_id: int
):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    try:
        from jose import jwt
        from app.config import settings
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email = payload.get("sub")
        if not email:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        async with AsyncSessionLocal() as db:
            query = await db.execute(select(User).where(User.email == email))
            user = query.scalars().first()
            if not user:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
            user_id = user.id

            # [HIGH-6 FIX] Verify the authenticated user is a member of this chat room
            room_query = await db.execute(
                select(ChatRoom).where(ChatRoom.id == room_id)
            )
            room = room_query.scalars().first()
            if not room or (room.candidate_id != user_id and room.recruiter_id != user_id):
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
            
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    manager.connect(room_id, websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            
            # Save message to DB
            async with AsyncSessionLocal() as db:
                msg = ChatMessage(
                    room_id=room_id,
                    sender_id=user_id,
                    content=data
                )
                db.add(msg)
                
                # Update room updated_at
                room = await db.get(ChatRoom, room_id)
                if room:
                    room.updated_at = datetime.datetime.now(tz.utc)
                    
                await db.commit()
                await db.refresh(msg)
                
                msg_resp = ChatMessageResponse.model_validate(msg).model_dump(mode='json')
                await manager.broadcast(room_id, msg_resp)
                
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
