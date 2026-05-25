import time
import json
import asyncio
from typing import Any, Optional
from collections import OrderedDict
import redis.asyncio as aioredis
from app.config import settings
from loguru import logger

class HybridCache:
    """
    Hybrid Caching Strategy for AI Model Inference
    L1: In-memory (Fastest, TTL: 5 min, Max 1000 entries)
    L2: Redis (Distributed, TTL: 1 hr)
    """
    def __init__(self, l1_ttl: int = 300, l1_max_size: int = 1000, l2_ttl: int = 3600):
        self.l1_ttl = l1_ttl
        self.l1_max_size = l1_max_size
        self.l2_ttl = l2_ttl
        
        # L1 Cache: OrderedDict to manage LRU, storing (timestamp, value)
        self._l1_cache: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = asyncio.Lock()
        
        # L2 Cache: Redis connection
        self._redis: Optional[aioredis.Redis] = None

    async def init_redis(self):
        if not self._redis:
            self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            logger.info("HybridCache: Redis L2 initialized.")

    async def close(self):
        if self._redis:
            await self._redis.aclose()

    async def get(self, key: str) -> Optional[Any]:
        # Check L1 Cache
        async with self._lock:
            if key in self._l1_cache:
                timestamp, value = self._l1_cache[key]
                if time.time() - timestamp <= self.l1_ttl:
                    # Move to end to mark as recently used
                    self._l1_cache.move_to_end(key)
                    logger.debug(f"Cache HIT (L1): {key}")
                    return value
                else:
                    # Expired in L1
                    del self._l1_cache[key]
        
        # Check L2 Cache
        if self._redis:
            try:
                cached_data = await self._redis.get(key)
                if cached_data:
                    value = json.loads(cached_data)
                    # Restore to L1
                    async with self._lock:
                        self._set_l1(key, value)
                    logger.debug(f"Cache HIT (L2): {key}")
                    return value
            except Exception as e:
                logger.error(f"Redis L2 Get Error: {e}")
                
        logger.debug(f"Cache MISS: {key}")
        return None

    def _set_l1(self, key: str, value: Any):
        if key in self._l1_cache:
            del self._l1_cache[key]
        elif len(self._l1_cache) >= self.l1_max_size:
            # Evict oldest (FIFO/LRU hybrid)
            self._l1_cache.popitem(last=False)
        self._l1_cache[key] = (time.time(), value)

    async def set(self, key: str, value: Any):
        # Set L1
        async with self._lock:
            self._set_l1(key, value)
        
        # Set L2
        if self._redis:
            try:
                await self._redis.setex(key, self.l2_ttl, json.dumps(value))
            except Exception as e:
                logger.error(f"Redis L2 Set Error: {e}")

    async def ping_redis(self) -> bool:
        if self._redis:
            try:
                return await self._redis.ping()
            except Exception:
                return False
        return False

# Global hybrid cache instance
hybrid_cache = HybridCache()
