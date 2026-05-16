import logging
from app.tasks.celery_app import celery_app
from app.ml.embedding import SentenceTransformerEmbedding
from app.ml.qdrant_manager import QdrantManager
from app.ml.slwg import SLWGModel

logger = logging.getLogger(__name__)

# Lazy initialization in worker
_embedding_model = None
_qdrant_manager = None
_slwg_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformerEmbedding()
    return _embedding_model

def get_qdrant_manager():
    global _qdrant_manager
    if _qdrant_manager is None:
        _qdrant_manager = QdrantManager()
    return _qdrant_manager

@celery_app.task(bind=True)
def generate_and_store_embedding(self, job_id: int, text: str, payload: dict = None):
    """
    Async task to generate vector embedding for a Job and store it in Qdrant.
    """
    try:
        logger.info(f"Generating embedding for job {job_id}")
        model = get_embedding_model()
        qdrant = get_qdrant_manager()
        
        vector = model.get_embedding(text)
        qdrant.add_vectors(vectors=[vector], ids=[job_id], payloads=[payload] if payload else None)
        
        return {"status": "success", "job_id": job_id}
    except Exception as e:
        logger.error(f"Error in generate_and_store_embedding: {e}")
        self.retry(exc=e, countdown=60, max_retries=3)

@celery_app.task(bind=True)
def run_hgat_matching(self, cv_text: str, candidate_ids: list[int]):
    """
    Placeholder for HGAT heavy inference.
    Takes CV text, embeds it, queries Qdrant/HGAT, and returns ranked results.
    """
    try:
        logger.info(f"Running HGAT matching for {len(candidate_ids)} candidates")
        # Initialize SLWG / HGAT models lazily here
        global _slwg_model
        if _slwg_model is None:
             _slwg_model = SLWGModel()
        
        # Heavy computation logic goes here...
        # Returns matched IDs and scores
        return {"status": "success", "matches": []}
    except Exception as e:
        logger.error(f"Error in run_hgat_matching: {e}")
        self.retry(exc=e, countdown=60, max_retries=3)
