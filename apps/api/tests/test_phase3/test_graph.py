import pytest
import torch
import numpy as np
import httpx
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine, AsyncSessionLocal


import torch
import os

def test_graph_file_exists():
    assert os.path.exists("data/graph.pt"), \
        "File graph chưa được build (scripts/build_graph.py)"

def test_graph_node_types():
    """Graph phải có đúng 5 node types theo paper"""
    graph = torch.load("data/graph.pt")
    required_types = ['job', 'skill', 'company', 'location', 'category']
    for nt in required_types:
        assert nt in graph.node_types, f"Graph thiếu node type '{nt}'"

def test_graph_node_counts():
    """Node counts phải match với paper Table 2"""
    graph = torch.load("data/graph.pt")
    assert graph['job'].x.shape[0] == 500, "Phải có 500 job nodes"
    assert graph['skill'].x.shape[0] >= 90, "Phải có ít nhất 100 skill nodes (paper: 117)"
    assert graph['company'].x.shape[0] >= 100, "Company nodes too few"
    assert graph['location'].x.shape[0] >= 10, "Location nodes too few"
    assert graph['category'].x.shape[0] >= 1, "Category nodes too few"

def test_graph_edge_types():
    """Graph phải có đủ 9 edge types từ Table 1 paper"""
    graph = torch.load("data/graph.pt")
    required_edges = [
        ('job', 'requires', 'skill'),
        ('skill', 'required_by', 'job'),
        ('job', 'belongs_to', 'category'),
        ('category', 'contains', 'job'),
        ('job', 'posted_by', 'company'),
        ('company', 'posts', 'job'),
        ('job', 'located_in', 'location'),
        ('location', 'has', 'job'),
        ('job', 'similar_to', 'job'),
    ]
    for edge_type in required_edges:
        assert edge_type in graph.edge_types, \
            f"Graph thiếu edge type {edge_type}"

def test_job_job_similarity_edges():
    """Job-Job similarity edges phải là nhiều nhất (paper: ~35,200)"""
    graph = torch.load("data/graph.pt")
    sim_edges = graph['job', 'similar_to', 'job'].edge_index.shape[1]
    assert sim_edges > 1000, \
        f"Job-job similarity edges quá ít: {sim_edges} (paper: ~35,200)"

@pytest.mark.asyncio
async def test_job_job_jaccard_threshold():
    """Job-similarity edges phải dựa trên Jaccard ≥ 0.3"""
    async with AsyncSession(engine) as session:
        result = await session.execute(
            text("SELECT MIN(jaccard_score) FROM job_similarity")
        )
        min_jaccard = result.scalar()
        assert min_jaccard >= 0.3, \
            f"Có edge với Jaccard < 0.3: {min_jaccard}"

def test_job_embedding_dimension_in_graph():
    """Job node features phải là 384-dim (từ sentence-transformer)"""
    graph = torch.load("data/graph.pt")
    assert graph['job'].x.shape[1] == 384, \
        f"Job node features sai dimension: {graph['job'].x.shape[1]}, cần 384"
