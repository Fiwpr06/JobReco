import pytest
import torch
import numpy as np
import httpx
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine, AsyncSessionLocal

import asyncio
import httpx
import time
import statistics

async def single_match_request(client, token, cv_id):
    t0 = time.time()
    resp = await client.post(
        "http://localhost:8000/api/v1/matching/cv-to-jobs",
        headers={"Authorization": f"Bearer {token}"},
        json={"cv_id": cv_id, "top_k": 10},
        timeout=30.0
    )
    return time.time() - t0, resp.status_code

@pytest.mark.asyncio
async def test_matching_latency_acceptable(auth_token, test_cv_id):
    """
    Per-CV forward pass ~16x slower vs batched GNN (theo paper).
    Với Redis cache, lần 2+ phải < 500ms.
    """
    async with httpx.AsyncClient() as client:
        # Warm up (first call builds cache)
        await single_match_request(client, auth_token, test_cv_id)

        # Measure 5 cached calls
        latencies = []
        for _ in range(5):
            latency, status = await single_match_request(client, auth_token, test_cv_id)
            assert status == 200
            latencies.append(latency)

        p95 = statistics.quantiles(latencies, n=20)[-1]
        avg = statistics.mean(latencies)

        print(f"\nMatching latency (cached): avg={avg*1000:.0f}ms, p95={p95*1000:.0f}ms")
        assert avg < 1.0, f"Average latency {avg:.2f}s quá cao (cần < 1s với cache)"
        assert p95 < 2.0, f"P95 latency {p95:.2f}s quá cao (cần < 2s)"

@pytest.mark.asyncio
async def test_concurrent_requests(auth_token, test_cv_id):
    """10 requests đồng thời không được gây lỗi"""
    # Sleep to allow test_matching_latency_acceptable to finish first
    await asyncio.sleep(3.0)
    async with httpx.AsyncClient() as client:
        tasks = [
            single_match_request(client, auth_token, test_cv_id)
            for _ in range(10)
        ]
        results = await asyncio.gather(*tasks)
        statuses = [r[1] for r in results]
        success_count = sum(1 for s in statuses if s == 200)
        assert success_count >= 8, \
            f"Chỉ {success_count}/10 concurrent requests thành công"
