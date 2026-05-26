import os
import re

TEST_DIR = "tests"

header = """import pytest
import torch
import numpy as np
import httpx
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine, AsyncSessionLocal

"""

# Fix test_graph.py specifically
graph_test = os.path.join(TEST_DIR, "test_phase3", "test_graph.py")
if os.path.exists(graph_test):
    with open(graph_test, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Add @pytest.mark.asyncio and async to test_job_job_jaccard_threshold
    content = content.replace(
        "def test_job_job_jaccard_threshold():", 
        "@pytest.mark.asyncio\nasync def test_job_job_jaccard_threshold():"
    )
    with open(graph_test, "w", encoding="utf-8") as f:
        f.write(content)

# Add headers to all test files
for root, dirs, files in os.walk(TEST_DIR):
    for file in files:
        if file.startswith("test_") and file.endswith(".py"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            if "import pytest" not in content:
                content = header + content
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                    
print("Fixed tests!")
