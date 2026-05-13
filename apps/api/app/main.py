import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from app.api.v1.router import router as api_v1_router
from app.config import settings
from app.utils.cache import hybrid_cache
from loguru import logger

# ── 1. Rate Limiting Setup ────────────────────────────────────────────────
# 100 req/min per IP by default
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# ── 2. Prometheus Metrics ──────────────────────────────────────────────────
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "http_status"]
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)
MATCH_LATENCY = Histogram(
    "match_inference_duration_seconds",
    "Time spent in AI matching inference",
    ["type"]
)

# ── 3. Lifecycle & App Init ────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Hybrid Cache (L1/L2)...")
    await hybrid_cache.init_redis()
    
    logger.info("Pre-loading GNN model and graph assets...")
    try:
        from app.api.v1.matching import preload_matching_assets
        preload_matching_assets()
    except Exception as e:
        logger.error(f"Lifespan GNN preload failed: {e}")
        
    yield
    # Shutdown
    logger.info("Closing Hybrid Cache connections...")
    await hybrid_cache.close()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for AI Job Matching System",
    lifespan=lifespan
)

from fastapi.middleware.cors import CORSMiddleware

# Register slowapi
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 4. Metrics Middleware ──────────────────────────────────────────────────
@app.middleware("http")
async def prometheus_middleware(request: Request, call_next):
    start_time = time.time()
    method = request.method
    # Use path, but group UUIDs/numbers to avoid cardinality explosion
    # Simplistic approach: just use request.url.path
    path = request.url.path
    
    response = await call_next(request)
    
    latency = time.time() - start_time
    status = str(response.status_code)
    
    # Exclude /api/v1/metrics from recording itself
    if path != "/api/v1/metrics":
        REQUEST_COUNT.labels(method=method, endpoint=path, http_status=status).inc()
        REQUEST_LATENCY.labels(method=method, endpoint=path).observe(latency)
        
    return response

# ── 5. Routes ──────────────────────────────────────────────────────────────
app.include_router(api_v1_router, prefix="/api/v1")

@app.get("/api/v1/metrics", tags=["Metrics"])
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/")
@limiter.limit("5/minute")
def read_root(request: Request):
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }
