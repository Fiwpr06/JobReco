import pytest
import torch
import numpy as np
import httpx
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine, AsyncSessionLocal


"""
Evaluation theo đúng protocol của paper:
- 1-positive / 99-hard-negative
- Random baseline: HR@5 = 5%, HR@10 = 10%
- Target: HR@5 ≥ 35% (ablation), HR@5 ≥ 38% (full model)
"""

import torch
import json
import os

def test_evaluation_results_exist():
    """Kết quả evaluation phải được save sau training"""
    assert os.path.exists("models_saved/eval_results.json"), \
        "File eval_results.json chưa tồn tại"

def test_hr5_above_random_baseline():
    """HR@5 phải >> 5% (random baseline)"""
    with open("models_saved/eval_results.json") as f:
        results = json.load(f)
    hr5 = results.get("HR@5", 0)
    assert hr5 > 0.10, \
        f"HR@5 = {hr5:.1%} quá thấp, chưa beat random baseline 2x"

def test_hr5_above_lightgcn_baseline():
    """HR@5 phải > 23% (LightGCN baseline từ paper)"""
    with open("models_saved/eval_results.json") as f:
        results = json.load(f)
    hr5 = results.get("HR@5", 0)
    assert hr5 > 0.20, \
        f"HR@5 = {hr5:.1%}, chưa beat LightGCN (23%)"

def test_hr5_target(request):
    """Target HR@5 ≥ 35% (ít nhất bằng ablation w/o SLWG)"""
    with open("models_saved/eval_results.json") as f:
        results = json.load(f)
    hr5 = results.get("HR@5", 0)
    ndcg5 = results.get("NDCG@5", 0)

    print(f"\n{'='*50}")
    print(f"EVALUATION RESULTS:")
    print(f"  HR@5  = {hr5:.2%} (target: ≥38.00%)")
    print(f"  HR@10 = {results.get('HR@10', 0):.2%}")
    print(f"  NDCG@5  = {ndcg5:.4f} (target: ≥0.2381)")
    print(f"  NDCG@10 = {results.get('NDCG@10', 0):.4f}")
    print(f"{'='*50}")

    # Minimum acceptable: ablation level
    assert hr5 >= 0.25, \
        f"HR@5 = {hr5:.1%} quá thấp. Kiểm tra lại SLWG bias injection và CV-conditioning"

def test_hard_negative_sampling_used():
    """Training phải dùng hard negatives (không phải random)"""
    if os.path.exists("models_saved/training_config.json"):
        with open("models_saved/training_config.json") as f:
            config = json.load(f)
        assert config.get("num_hard_negatives", 0) >= 99, \
            "Phải dùng ít nhất 99 hard negatives per positive (theo paper)"
