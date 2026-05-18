import asyncio
from sqlalchemy.future import select
from app.database import AsyncSessionLocal
from app.models.job import Job
from app.models.cv import CV
import numpy as np

async def test():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Job).limit(5))
        jobs = res.scalars().all()
        for j in jobs:
            print(f"Job {j.id}: graph_node_id={j.graph_node_id}")
            if j.embedding:
                print(f"  Embedding len: {len(j.embedding)}, sum: {np.sum(j.embedding):.4f}")
            else:
                print("  No embedding")
        
        print("---")
        res = await db.execute(select(CV).limit(5))
        cvs = res.scalars().all()
        for c in cvs:
            print(f"CV {c.id}: title={c.title_en}")
            if c.embedding:
                print(f"  Embedding len: {len(c.embedding)}, sum: {np.sum(c.embedding):.4f}")
            else:
                print("  No embedding")

if __name__ == "__main__":
    asyncio.run(test())
