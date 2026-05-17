import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class QdrantManager:
    """
    Manages Qdrant Vector Database connection and operations.
    Replaces local FAISS index for distributed, scalable similarity search.
    """
    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.collection_name = settings.QDRANT_COLLECTION_NAME
        
        try:
            self.client = QdrantClient(url=settings.QDRANT_URL)
            self._ensure_collection()
        except Exception as e:
            logger.error(f"Failed to connect to Qdrant: {e}")
            self.client = None

    def _ensure_collection(self):
        """Creates collection if it doesn't exist."""
        if not self.client: return
        
        collections = self.client.get_collections().collections
        if not any(c.name == self.collection_name for c in collections):
            logger.info(f"Creating Qdrant collection: {self.collection_name}")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=self.dimension, distance=Distance.COSINE),
            )

    def add_vectors(self, vectors: np.ndarray, ids: list[int], payloads: list[dict] = None):
        """
        Upserts vectors with their DB IDs and optional metadata payloads.
        """
        if not self.client: return
        
        if isinstance(vectors, list):
            vectors = np.array(vectors, dtype=np.float32)
            
        if payloads is None:
            payloads = [{} for _ in ids]
            
        points = [
            PointStruct(id=int(vid), vector=vec.tolist(), payload=payload)
            for vid, vec, payload in zip(ids, vectors, payloads)
        ]
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )

    def search(self, query_vector: np.ndarray, k: int = 50, filter_dict: dict = None) -> list[tuple[int, float]]:
        """
        Searches the index with the query vector. Supports metadata filtering.
        Returns a list of tuples: (db_id, similarity_score).
        """
        if not self.client: return []
        
        if isinstance(query_vector, list):
            query_vector = np.array(query_vector, dtype=np.float32)
            
        if len(query_vector.shape) == 1:
            query_vector = query_vector.tolist()
        elif len(query_vector.shape) == 2:
            query_vector = query_vector[0].tolist()
            
        query_filter = None
        if filter_dict:
            must_conditions = [
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in filter_dict.items()
            ]
            query_filter = Filter(must=must_conditions)

        search_result = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=k
        )
        
        return [(int(hit.id), hit.score) for hit in search_result]
