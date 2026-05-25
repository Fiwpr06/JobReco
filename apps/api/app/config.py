from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
import warnings

class Settings(BaseSettings):
    APP_NAME: str = "JobMatchingAPI"
    APP_VERSION: str = "2.0.0"
    SECRET_KEY: str = "change-me-in-production"
    
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/job_matching"
    REDIS_URL: str = "redis://localhost:6379/0"
    MATCH_CACHE_TTL: int = 3600
    
    # Embedding Model
    EMBEDDING_MODEL: str = "paraphrase-multilingual-MiniLM-L12-v2"
    EMBEDDING_DIM: int = 384
    
    # HGAT Model
    HGAT_HIDDEN_DIM: int = 128
    HGAT_NUM_HEADS: int = 4
    HGAT_NUM_LAYERS: int = 2
    HGAT_DROPOUT: float = 0.2
    HGAT_LR: float = 0.001
    HGAT_BATCH_SIZE: int = 16
    HGAT_EPOCHS: int = 3
    
    # SLWG Weights
    SLWG_EASY: float = 0.1
    SLWG_MEDIUM: float = 0.3
    SLWG_HARD: float = 0.7
    
    # Matching Candidates
    JACCARD_THRESHOLD: float = 0.3
    FAISS_TOP_K_CANDIDATES: int = 50          # [CRIT-8 FIX] was missing; referenced in matching.py
    FAISS_INDEX_TYPE: str = "FlatIP"
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION_NAME: str = "job_embeddings"
    QDRANT_TOP_K_CANDIDATES: int = 50
    
    # Translation
    TRANSLATION_PROVIDER: str = "argostranslate"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = "your_cloud_name"
    CLOUDINARY_API_KEY: str = "your_api_key"
    CLOUDINARY_API_SECRET: str = "your_api_secret"
    
    # Payments
    BANK_ID: str = "MB"
    BANK_ACCOUNT_NO: str = "000000000"
    BANK_ACCOUNT_NAME: str = "COMPANY_NAME"
    PAYMENT_WEBHOOK_SECRET: str = "default-webhook-secret-change-me"
    
    # Environment
    NODE_ENV: str = "development"

    # [CRIT-7 FIX] Warn loudly if the JWT secret is the insecure default
    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if v == "change-me-in-production" or len(v) < 32:
            import os
            env = os.getenv("NODE_ENV", "development")
            if env == "production":
                raise ValueError("SECURITY ERROR: SECRET_KEY must be ≥ 32 chars in production.")
            warnings.warn(
                "SECURITY WARNING: SECRET_KEY is weak or set to the insecure default. "
                "Set a strong random SECRET_KEY (≥ 32 chars) in your .env file before deploying to production.",
                stacklevel=2,
            )
        return v

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
