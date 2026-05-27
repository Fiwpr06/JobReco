from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

# [MED-5 FIX] Configure connection pool to prevent unbounded connections.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=20,        # Maximum steady-state connections
    max_overflow=10,     # Extra connections allowed under burst load
    pool_timeout=30,     # Seconds to wait for a connection before raising
    pool_recycle=3600,   # Recycle connections after 1 hour to avoid stale DB handles
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
