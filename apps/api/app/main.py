import re
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from app.api.v1.router import router as api_v1_router
from app.config import settings
from app.utils.cache import hybrid_cache
from loguru import logger

from jose import JWTError, jwt
from app.services.auth_service import SECRET_KEY, ALGORITHM

from app.utils.rate_limit import limiter

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
        await preload_matching_assets()
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

# ── [MED-1 FIX] Middleware ordering ────────────────────────────────────────
# Starlette processes middlewares in LIFO (last added = outermost).
# We add CORS LAST so it wraps everything (runs first on request, last on response).

# Register slowapi
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    response = await call_next(request)
    if not request.url.path.startswith("/docs") and not request.url.path.startswith("/redoc") and not request.url.path.startswith("/openapi.json"):
        response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    logger.error(f"Unhandled exception: {exc}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": str(exc), "traceback": tb},
    )

# ── 3.5 JWT Decoder Middleware for Rate Limiter ──────────────────────────
@app.middleware("http")
async def extract_user_tier_middleware(request: Request, call_next):
    tier = "free"
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            tier = payload.get("tier", "free")
        except JWTError:
            pass
    request.state.user_tier = tier
    return await call_next(request)

# ── 4. Metrics Middleware ──────────────────────────────────────────────────
@app.middleware("http")
async def prometheus_middleware(request: Request, call_next):
    start_time = time.time()
    method = request.method
    path = re.sub(r'/\d+', '/{id}', request.url.path)
    
    response = await call_next(request)
    
    latency = time.time() - start_time
    status = str(response.status_code)
    
    # Exclude /api/v1/metrics from recording itself
    if path != "/api/v1/metrics":
        REQUEST_COUNT.labels(method=method, endpoint=path, http_status=status).inc()
        REQUEST_LATENCY.labels(method=method, endpoint=path).observe(latency)
        
    return response

# [CRIT-2 FIX] Read CORS origins from environment instead of hard-coding localhost.
# Supports comma-separated list: CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
import os
_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost")
_cors_origins = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
