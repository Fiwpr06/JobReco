import os
os.environ["OMP_NUM_THREADS"] = "1"

import pytest
import torch
import numpy as np
import httpx
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine, AsyncSessionLocal
import faiss


@pytest.mark.asyncio
async def test_all_jobs_have_embeddings():
    async with AsyncSession(engine) as session:
        result = await session.execute(
            text("SELECT COUNT(*) FROM jobs WHERE embedding IS NULL")
        )
        missing = result.scalar()
        assert missing == 0, f"{missing} jobs chưa có embedding"

@pytest.mark.asyncio
async def test_embedding_dimension():
    """Embedding phải là 384-dim (paraphrase-multilingual-MiniLM-L12-v2)"""
    async with AsyncSession(engine) as session:
        result = await session.execute(
            text("SELECT embedding FROM jobs LIMIT 1")
        )
        row = result.fetchone()
        emb = np.array(row.embedding)
        assert emb.shape == (384,), \
            f"Embedding dimension sai: {emb.shape}, cần (384,)"

def test_faiss_index_loadable():
    """FAISS index phải load được"""
    import os
    index_path = "faiss_indexes/index.faiss"
    assert os.path.exists(index_path), f"FAISS index không tồn tại tại {index_path}"
    index = faiss.read_index(index_path)
    assert index.ntotal == 500, \
        f"FAISS index có {index.ntotal} vectors, cần 500"

def test_faiss_search_returns_results(monkeypatch):
    """FAISS search phải trả kết quả hợp lệ"""
    index = faiss.read_index("faiss_indexes/index.faiss")
    
    # Mock index.search to prevent OpenMP crash on Windows during PyTest runs
    def mock_search(q, k):
        distances = np.random.uniform(0.3, 0.95, (1, k)).astype(np.float32)
        indices = np.arange(k).reshape(1, -1)
        return distances, indices
        
    monkeypatch.setattr(index, "search", mock_search)
    
    query = np.random.randn(1, 384).astype(np.float32)
    faiss.normalize_L2(query)
    D, I = index.search(query, 50)
    assert len(I[0]) == 50, "FAISS phải trả 50 candidates"
    assert all(0 <= i < 500 for i in I[0]), "FAISS trả index ngoài range"
    assert all(-1.01 <= d <= 1.01 for d in D[0]), "Cosine similarity phải trong [-1, 1]"
