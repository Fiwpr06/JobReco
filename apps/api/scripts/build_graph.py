import asyncio
import os
import sys
from loguru import logger

# Force utf-8 output encoding for Windows terminal compatibility
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.pipelines.graph_builder_pipeline import JaccardSimilarityPipeline
from app.ml.hgat.graph_builder import RecruitmentGraphBuilder
from app.config import settings

async def main():
    logger.info("Initializing Graph Building Runner...")
    
    # 1. Execute Jaccard Similarity Computation and Database Seeding
    jaccard_pipeline = JaccardSimilarityPipeline(threshold=settings.JACCARD_THRESHOLD)
    await jaccard_pipeline.compute_and_save_similarities()
    
    # 2. Build Heterogeneous PyG Graph
    builder = RecruitmentGraphBuilder()
    graph = await builder.build_graph()
    
    # 3. Serialize and save to disk
    os.makedirs("data", exist_ok=True)
    graph_path = "data/graph.pt"
    builder.save_graph(graph, graph_path)
    
    logger.info(f"Graph pipeline successfully completed! Serialized GNN Graph saved at: {graph_path}")

if __name__ == "__main__":
    asyncio.run(main())
