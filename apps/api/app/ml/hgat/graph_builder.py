import os
import torch
from torch_geometric.data import HeteroData
from sqlalchemy.future import select
from app.database import AsyncSessionLocal
from app.models.job import Job, Company, Location, JobSkill, JobSimilarity
from app.models.skill import Skill
from loguru import logger

class RecruitmentGraphBuilder:
    """
    Builds the Heterogeneous Graph G = (V, E) from DB entities:
    - 5 node types: 'job', 'skill', 'company', 'location', 'category'
    - 9 edge types
    
    Dynamically maps DB primary keys to zero-indexed GNN node IDs and updates
    the DB accordingly for seamless API-level matching lookups.
    """

    async def build_graph(self) -> HeteroData:
        logger.info("Initializing Heterogeneous Graph construction...")
        
        async with AsyncSessionLocal() as session:
            # 1. Load active Jobs, Skills, Companies
            jobs_query = await session.execute(select(Job).where(Job.is_active == True))
            jobs = jobs_query.scalars().all()
            
            skills_query = await session.execute(select(Skill))
            skills = skills_query.scalars().all()
            
            companies_query = await session.execute(select(Company))
            companies = companies_query.scalars().all()
            
            if not jobs or not skills:
                raise ValueError("Database must contain seeded jobs and skills to build graph.")

            # Dynamic locations seeding
            locations_query = await session.execute(select(Location))
            locations = locations_query.scalars().all()
            if not locations:
                logger.info("Locations table is empty. Dynamically seeding from job address distinct values...")
                unique_addresses = sorted(list(set(j.job_address for j in jobs if j.job_address)))
                if not unique_addresses:
                    unique_addresses = ["Hà Nội", "Hồ Chí Minh"]
                for addr in unique_addresses:
                    region = "North" if "Hà Nội" in addr or "Ha Noi" in addr else "South"
                    loc = Location(name_vi=addr, name_en=addr, region=region)
                    session.add(loc)
                await session.commit()
                
                # Reload locations
                locations_query = await session.execute(select(Location))
                locations = locations_query.scalars().all()

            # Dynamic categories seeding
            categories = sorted(list(set(j.job_category for j in jobs if j.job_category)))
            if not categories:
                logger.info("Categories are empty. Auto-assigning default 'IT & Technology' category...")
                categories = ["IT & Technology"]
                for j in jobs:
                    j.job_category = "IT & Technology"
                await session.commit()
            
            logger.info(f"Loaded node counts: Jobs={len(jobs)}, Skills={len(skills)}, "
                        f"Companies={len(companies)}, Locations={len(locations)}, Categories={len(categories)}")

            # 2. Establish mapping: Database ID -> Sequential Zero-Indexed Graph ID
            job_id_map = {job.id: idx for idx, job in enumerate(jobs)}
            skill_id_map = {skill.id: idx for idx, skill in enumerate(skills)}
            company_id_map = {company.id: idx for idx, company in enumerate(companies)}
            location_id_map = {location.id: idx for idx, location in enumerate(locations)}
            category_map = {cat: idx for idx, cat in enumerate(categories)}

            # Update DB graph_node_id values to match GNN indices (essential for stage-2 matching)
            logger.info("Updating DB models with active graph node IDs...")
            for job in jobs:
                job.graph_node_id = job_id_map[job.id]
            for skill in skills:
                skill.graph_node_id = skill_id_map[skill.id]
            for company in companies:
                company.graph_node_id = company_id_map[company.id]
            for location in locations:
                location.graph_node_id = location_id_map[location.id]
                
            await session.commit()
            logger.info("Database graph_node_id columns synchronized.")

            # 3. Initialize PyG HeteroData Graph
            graph = HeteroData()

            # Set node features
            # 'job' uses the 384-dimensional text embeddings from sentence-transformers
            job_embeds = []
            for j in jobs:
                # Fallback to zero vector if embedding is missing
                if j.embedding:
                    job_embeds.append(torch.tensor(j.embedding, dtype=torch.float))
                else:
                    job_embeds.append(torch.zeros(384, dtype=torch.float))
            graph['job'].x = torch.stack(job_embeds)
            
            # Non-job nodes ('skill', 'company', 'location', 'category') are initialized with empty feature placeholders.
            # Learnable parameters (128-dim embeddings) are registered inside the CVConditionedHGAT model class.
            graph['skill'].x = torch.zeros(len(skills), 128)
            graph['company'].x = torch.zeros(len(companies), 128)
            graph['location'].x = torch.zeros(len(locations), 128)
            graph['category'].x = torch.zeros(len(categories), 128)

            # 4. Build Edge Relations
            # 4a. Job → Skill (requires) + inverse
            job_skills_query = await session.execute(select(JobSkill))
            job_skills = job_skills_query.scalars().all()
            
            job_skill_src, job_skill_dst = [], []
            job_skill_meta = [] # Edge metadata used by SLWG gap analyzer: [(job_id, skill_id, skill_obj, is_required)]
            
            skill_lookup = {s.id: s for s in skills}
            
            for js in job_skills:
                if js.job_id in job_id_map and js.skill_id in skill_id_map:
                    g_job_idx = job_id_map[js.job_id]
                    g_skill_idx = skill_id_map[js.skill_id]
                    
                    job_skill_src.append(g_job_idx)
                    job_skill_dst.append(g_skill_idx)
                    
                    job_skill_meta.append((
                        js.job_id,
                        js.skill_id,
                        skill_lookup[js.skill_id],
                        js.is_required
                    ))

            graph['job', 'requires', 'skill'].edge_index = torch.tensor([job_skill_src, job_skill_dst], dtype=torch.long)
            graph['job', 'requires', 'skill'].edge_attr = job_skill_meta
            graph['skill', 'required_by', 'job'].edge_index = torch.tensor([job_skill_dst, job_skill_src], dtype=torch.long)

            # 4b. Job → Company (posted_by) + inverse
            comp_src, comp_dst = [], []
            for j in jobs:
                if j.company_id and j.company_id in company_id_map:
                    comp_src.append(job_id_map[j.id])
                    comp_dst.append(company_id_map[j.company_id])
                    
            graph['job', 'posted_by', 'company'].edge_index = torch.tensor([comp_src, comp_dst], dtype=torch.long)
            graph['company', 'posts', 'job'].edge_index = torch.tensor([comp_dst, comp_src], dtype=torch.long)

            # 4c. Job → Location (located_in) + inverse
            # We map the location via company's location or the job_address string.
            # Here we resolve by matching jobs.job_address with location.name_vi
            loc_lookup = {loc.name_vi: loc.id for loc in locations}
            loc_src, loc_dst = [], []
            for j in jobs:
                if j.job_address and j.job_address in loc_lookup:
                    loc_db_id = loc_lookup[j.job_address]
                    if loc_db_id in location_id_map:
                        loc_src.append(job_id_map[j.id])
                        loc_dst.append(location_id_map[loc_db_id])
                        
            graph['job', 'located_in', 'location'].edge_index = torch.tensor([loc_src, loc_dst], dtype=torch.long)
            graph['location', 'has', 'job'].edge_index = torch.tensor([loc_dst, loc_src], dtype=torch.long)

            # 4d. Job → Category (belongs_to) + inverse
            cat_src, cat_dst = [], []
            for j in jobs:
                if j.job_category and j.job_category in category_map:
                    cat_src.append(job_id_map[j.id])
                    cat_dst.append(category_map[j.job_category])
                    
            graph['job', 'belongs_to', 'category'].edge_index = torch.tensor([cat_src, cat_dst], dtype=torch.long)
            graph['category', 'contains', 'job'].edge_index = torch.tensor([cat_dst, cat_src], dtype=torch.long)

            # 4e. Job ↔ Job Similarity (similar_to, Jaccard threshold >= 0.3)
            sim_query = await session.execute(select(JobSimilarity))
            similarities = sim_query.scalars().all()
            
            sim_src, sim_dst = [], []
            for sim in similarities:
                if sim.job_id_a in job_id_map and sim.job_id_b in job_id_map:
                    g_a = job_id_map[sim.job_id_a]
                    g_b = job_id_map[sim.job_id_b]
                    
                    # Bidirectional edge injection
                    sim_src.extend([g_a, g_b])
                    sim_dst.extend([g_b, g_a])
            
            # Handle fallback if no similar jobs found
            if not sim_src:
                graph['job', 'similar_to', 'job'].edge_index = torch.empty((2, 0), dtype=torch.long)
            else:
                graph['job', 'similar_to', 'job'].edge_index = torch.tensor([sim_src, sim_dst], dtype=torch.long)

            logger.info("Heterogeneous Graph construction complete!")
            return graph
            
    def save_graph(self, graph: HeteroData, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        torch.save(graph, filepath)
        logger.info(f"Graph successfully serialized and saved to {filepath}")

    def load_graph(self, filepath: str) -> HeteroData:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"No serialized graph found at {filepath}")
        # [HIGH-3 FIX] weights_only=False is required for HeteroData (PyG) objects
        # which contain non-tensor Python objects (e.g. edge_attr lists).
        # Explicit flag suppresses the PyTorch >= 2.0 deprecation warning and
        # makes intent clear. Only load graphs from trusted sources.
        graph = torch.load(filepath, weights_only=False)
        logger.info(f"Graph successfully loaded from {filepath}")
        return graph

