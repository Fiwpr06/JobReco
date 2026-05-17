"""
FAISS Index Manager
===================
[HIGH-2 FIX] This file was missing — it is imported by both jobs.py and matching.py
but did not exist in app/ml/.  The project only had qdrant_manager.py.

Wraps Meta's FAISS (IndexFlatIP / IVF) for fast approximate-nearest-neighbour
search over L2-normalised sentence-transformer embeddings.

Strategy
--------
* ``IndexFlatIP`` (Inner Product ≈ Cosine for L2-normalised vectors) is used
  at small scale (< 100k vectors).  Exact, no training needed.
* The manager stores a parallel ``id_map`` list so FAISS integer indices can be
  mapped back to database Job IDs.
"""

from __future__ import annotations

import os
import json
from typing import List, Optional, Tuple

import numpy as np

try:
    import faiss  # type: ignore
    _FAISS_AVAILABLE = True
except ImportError:
    _FAISS_AVAILABLE = False

from app.config import settings


class FAISSIndexManager:
    """
    Manages a FAISS IndexFlatIP for dense vector search over job embeddings.

    Usage
    -----
    Build phase (run once via scripts/build_faiss_index.py)::

        manager = FAISSIndexManager(dimension=384)
        manager.add(vectors, db_ids)
        manager.save("faiss_indexes/index.faiss")

    Inference phase (called by jobs.py / matching.py)::

        manager = FAISSIndexManager(dimension=384)
        manager.load("faiss_indexes/index.faiss")
        results = manager.search(query_vec, k=50)
        # → [(job_db_id, score), ...]
    """

    def __init__(self, dimension: int = settings.EMBEDDING_DIM):
        self.dimension = dimension
        self._index: Optional[object] = None   # faiss.Index or None
        self._id_map: List[int] = []           # FAISS pos → DB job ID

    # ------------------------------------------------------------------
    # Build helpers
    # ------------------------------------------------------------------

    def add(self, vectors: List[List[float]], db_ids: List[int]) -> None:
        """Add a batch of L2-normalised vectors with their DB IDs."""
        if not _FAISS_AVAILABLE:
            raise RuntimeError("faiss-cpu is not installed. Run: pip install faiss-cpu")

        mat = np.array(vectors, dtype=np.float32)
        if self._index is None:
            self._index = faiss.IndexFlatIP(self.dimension)
        self._index.add(mat)             # type: ignore[union-attr]
        self._id_map.extend(db_ids)

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, filepath: str) -> None:
        """Serialise index to disk alongside a JSON id_map sidecar file."""
        if not _FAISS_AVAILABLE:
            raise RuntimeError("faiss-cpu is not installed.")
        if self._index is None:
            raise ValueError("Index is empty — call add() before save().")

        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        faiss.write_index(self._index, filepath)            # type: ignore[attr-defined]

        id_map_path = filepath + ".id_map.json"
        with open(id_map_path, "w") as f:
            json.dump(self._id_map, f)

    def load(self, filepath: str) -> None:
        """Load a previously saved index and its id_map sidecar."""
        if not _FAISS_AVAILABLE:
            raise RuntimeError("faiss-cpu is not installed.")
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"FAISS index not found at: {filepath}")

        self._index = faiss.read_index(filepath)            # type: ignore[attr-defined]

        id_map_path = filepath + ".id_map.json"
        if os.path.exists(id_map_path):
            with open(id_map_path) as f:
                self._id_map = json.load(f)
        else:
            # Graceful fallback: assume FAISS positions == DB IDs (only valid if
            # the index was built sequentially from id=0)
            self._id_map = list(range(self._index.ntotal))  # type: ignore[union-attr]

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search(
        self,
        query_vector: List[float],
        k: int = 50,
    ) -> List[Tuple[int, float]]:
        """
        Return the top-k most similar jobs for a query embedding.

        Parameters
        ----------
        query_vector : list[float]
            L2-normalised 384-dim embedding from SentenceTransformerEmbedding.
        k : int
            Number of nearest neighbours to return.

        Returns
        -------
        list of (db_job_id, cosine_score) tuples, sorted descending by score.
        Returns an empty list if the index is not loaded or faiss is unavailable.
        """
        if not _FAISS_AVAILABLE or self._index is None:
            return []

        mat = np.array([query_vector], dtype=np.float32)
        actual_k = min(k, self._index.ntotal)               # type: ignore[union-attr]
        if actual_k == 0:
            return []

        scores, indices = self._index.search(mat, actual_k)  # type: ignore[union-attr]
        scores = scores[0]
        indices = indices[0]

        results: List[Tuple[int, float]] = []
        for idx, score in zip(indices, scores):
            if idx == -1:
                continue  # FAISS sentinel for "not enough results"
            if idx < len(self._id_map):
                results.append((self._id_map[idx], float(score)))

        return results

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    @property
    def total_vectors(self) -> int:
        """Number of vectors currently in the index."""
        if self._index is None:
            return 0
        return self._index.ntotal   # type: ignore[union-attr]
