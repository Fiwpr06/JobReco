from fastapi import APIRouter
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from app.database import AsyncSessionLocal
from app.utils.cache import hybrid_cache
import os

router = APIRouter()

FAISS_INDEX_PATH = os.path.join(os.getcwd(), "faiss_indexes", "index.faiss")
MODEL_WEIGHTS_PATH = os.path.join(os.getcwd(), "models_saved", "hgat_v1.pt")

async def get_db_session():
    async with AsyncSessionLocal() as session:
        yield session

@router.get("/", summary="Health Check")
async def health_check(db: AsyncSession = Depends(get_db_session)):
    status = {
        "status": "ok",
        "services": {}
    }
    
    # 1. Check DB
    try:
        await db.execute(select(1))
        status["services"]["database"] = "up"
    except Exception as e:
        status["services"]["database"] = f"down - {e}"
        status["status"] = "degraded"
        
    # 2. Check Redis
    redis_ok = await hybrid_cache.ping_redis()
    status["services"]["redis"] = "up" if redis_ok else "down"
    if not redis_ok:
        status["status"] = "degraded"
        
    # 3. Check FAISS
    if os.path.exists(FAISS_INDEX_PATH):
        status["services"]["faiss"] = "ready"
    else:
        status["services"]["faiss"] = "missing"
        status["status"] = "degraded"
        
    # 4. Check Model
    if os.path.exists(MODEL_WEIGHTS_PATH):
        status["services"]["model"] = "ready"
    else:
        status["services"]["model"] = "missing"
        status["status"] = "degraded"
        
    return status
