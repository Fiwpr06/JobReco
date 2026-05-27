from sentence_transformers import SentenceTransformer
import numpy as np
import threading
from app.config import settings

class SentenceTransformerEmbedding:
    """
    Sentence transformer embedding manager for generating 384-dimensional text embeddings.
    Loads 'paraphrase-multilingual-MiniLM-L12-v2' and L2-normalizes the vectors for cosine similarity.
    Uses a class-level singleton cache to avoid multiple loads in memory.
    """
    _model_instance = None
    # [HIGH-4 FIX] Thread-safe initialization lock
    _init_lock = threading.Lock()
    
    def __init__(self):
        if SentenceTransformerEmbedding._model_instance is None:
            with SentenceTransformerEmbedding._init_lock:
                # Double-check after acquiring lock (double-checked locking pattern)
                if SentenceTransformerEmbedding._model_instance is None:
                    model_name = settings.EMBEDDING_MODEL
                    SentenceTransformerEmbedding._model_instance = SentenceTransformer(model_name)
        self.model = SentenceTransformerEmbedding._model_instance

    def get_embedding(self, text: str) -> list[float]:
        if not text or not isinstance(text, str):
            return [0.0] * settings.EMBEDDING_DIM
            
        embedding = self.model.encode(text, convert_to_numpy=True)
        
        # L2 normalization for direct cosine similarity (dot product = cosine similarity)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
            
        return embedding.tolist()

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
            
        clean_texts = [t if isinstance(t, str) and t else "" for t in texts]
        embeddings = self.model.encode(clean_texts, convert_to_numpy=True)
        
        normalized_embeddings = []
        for emb in embeddings:
            norm = np.linalg.norm(emb)
            if norm > 0:
                emb = emb / norm
            normalized_embeddings.append(emb.tolist())
            
        return normalized_embeddings
