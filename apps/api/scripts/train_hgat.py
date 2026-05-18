"""
scripts/train_hgat.py
=====================
Orchestration script for the Phase 3 HGAT training pipeline.

Steps:
  1. Generate 200 synthetic candidate CV profiles in the database
     (skipped if the DB already contains ≥ 200 CVs).
  2. Load the serialised heterogeneous recruitment graph (data/graph.pt).
  3. Build training triplets via hard-negative mining
     (1 positive + 99 hard-negatives per candidate).
  4. Initialise CVConditionedHGAT (H=4 heads, D=32, L=2 layers).
  5. Train for HGAT_EPOCHS epochs using BPR loss.
  6. Evaluate on the held-out 20 % split using 1-pos / 99-neg protocol.
  7. Save trained weights to models_saved/hgat_v1.pt.
"""

import asyncio
import os
import random
import sys

import torch
from loguru import logger
from sqlalchemy.future import select
from sqlalchemy import func

# ── Windows UTF-8 terminal fix ─────────────────────────────────────────── #
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import AsyncSessionLocal
from app.models.cv import CV, CVSkill
from app.models.job import Job, JobSkill
from app.models.skill import Skill
from app.models.user import User
from app.ml.embedding import SentenceTransformerEmbedding
from app.ml.hgat.model import CVConditionedHGAT
from app.ml.hgat.trainer import HGATTrainer, build_hard_negatives
from app.ml.slwg import SLWGComputer
from app.ml.hgat.graph_builder import RecruitmentGraphBuilder
from app.config import settings


# ===========================================================================
# Synthetic CV generator
# ===========================================================================

class SyntheticCVGenerator:
    """
    Seeds 200 realistic candidate CV profiles into the database by sampling
    skills from existing job requirements plus a small amount of noise.
    """

    def __init__(self, embedding_service: SentenceTransformerEmbedding):
        self.emb_svc = embedding_service

    async def generate(self, num_profiles: int = 200) -> None:
        async with AsyncSessionLocal() as session:
            existing = (await session.execute(
                select(func.count(CV.id))
            )).scalar_one()

            if existing >= num_profiles:
                logger.info(
                    f"DB already has {existing} CV profiles — skipping generation."
                )
                return

            logger.info(f"Generating {num_profiles} synthetic candidate profiles…")

            jobs   = (await session.execute(
                select(Job).where(Job.is_active == True)
            )).scalars().all()
            skills = (await session.execute(select(Skill))).scalars().all()
            js_all = (await session.execute(select(JobSkill))).scalars().all()

            job_skill_map: dict = {}
            for js in js_all:
                job_skill_map.setdefault(js.job_id, []).append(js.skill_id)

            skill_lut = {s.id: s for s in skills}

            for i in range(num_profiles):
                # ── Select positive job to base candidate on ──────────────── #
                pos_job = random.choice(jobs)
                req_ids = job_skill_map.get(pos_job.id, [])

                # 70 % of required skills + 1-3 random extras
                cand_ids = []
                if req_ids:
                    k = max(1, int(len(req_ids) * 0.7))
                    cand_ids.extend(random.sample(req_ids, k))
                for s in random.sample(skills, min(len(skills), random.randint(1, 3))):
                    if s.id not in cand_ids:
                        cand_ids.append(s.id)

                # ── Avoid duplicate user emails ────────────────────────────── #
                email = f"synth_{i:04d}@jobmatching.ai"
                if (await session.execute(
                    select(User).where(User.email == email)
                )).scalars().first():
                    continue

                # ── Create User ────────────────────────────────────────────── #
                user = User(
                    email=email,
                    hashed_password="placeholder_not_for_login",
                    full_name=f"Synthetic Candidate {i:04d}",
                    role="candidate",
                )
                session.add(user)
                await session.flush()

                # ── Build summary text and embedding ───────────────────────── #
                title_en   = pos_job.title_en or "Software Engineer"
                exp_years  = float(max(
                    1.0,
                    float(pos_job.experience_min_years or 2.0) + random.uniform(-1.0, 2.0),
                ))
                skills_txt = ", ".join(skill_lut[sid].name for sid in cand_ids
                                       if sid in skill_lut)
                summary_en = (
                    f"Dedicated professional with {exp_years:.1f} years of experience. "
                    f"Skilled in {skills_txt}."
                )
                emb_vec = self.emb_svc.get_embedding(f"{title_en} {summary_en}")

                # ── Create CV ─────────────────────────────────────────────── #
                cv_title = f"Senior {title_en}" if exp_years >= 5.0 else title_en
                cv = CV(
                    user_id=user.id,
                    title_en=cv_title,
                    summary_en=summary_en,
                    experience_years=exp_years,
                    expected_salary_min_vnd=pos_job.salary_min_vnd or 15_000_000,
                    expected_salary_max_vnd=pos_job.salary_max_vnd or 35_000_000,
                    preferred_locations=[pos_job.job_address] if pos_job.job_address else ["Hà Nội"],
                    preferred_job_types=["Full-time"],
                    raw_text_en=summary_en,
                    embedding=emb_vec,
                    is_primary=True,
                )
                session.add(cv)
                await session.flush()

                # ── Link CVSkills ─────────────────────────────────────────── #
                for sid in cand_ids:
                    session.add(CVSkill(
                        cv_id=cv.id,
                        skill_id=sid,
                        proficiency_level=random.choice(
                            ["intermediate", "advanced", "expert"]
                        ),
                        years_experience=round(random.uniform(0.5, exp_years), 1),
                        is_self_assessed=True,
                    ))

                if (i + 1) % 20 == 0:
                    await session.commit()
                    logger.info(f"  … committed {i + 1} profiles so far")

            await session.commit()
            logger.info("Synthetic candidate generation complete.")


# ===========================================================================
# Training pipeline
# ===========================================================================

async def run_training_pipeline() -> None:
    logger.info("═" * 60)
    logger.info("  HGAT Training Pipeline — Phase 3")
    logger.info("═" * 60)

    # ── Step 1: Embedding service ─────────────────────────────────────── #
    emb_svc = SentenceTransformerEmbedding()

    # ── Step 2: Synthetic CV seeding ──────────────────────────────────── #
    seeder = SyntheticCVGenerator(emb_svc)
    await seeder.generate(num_profiles=200)

    # ── Step 3: Load serialised graph ─────────────────────────────────── #
    graph_path = os.path.join(os.getcwd(), "data", "graph.pt")
    builder = RecruitmentGraphBuilder()
    graph   = builder.load_graph(graph_path)

    N_job = graph["job"].x.size(0)
    logger.info(f"Graph loaded — {N_job} job nodes")

    # ── Step 4: Load CV data from DB and build triplets ───────────────── #
    logger.info("Building 1-positive / 99-hard-negative triplets…")

    async with AsyncSessionLocal() as session:
        cvs       = (await session.execute(select(CV))).scalars().all()
        cv_skills = (await session.execute(select(CVSkill))).scalars().all()
        jobs      = (await session.execute(
            select(Job).where(Job.is_active == True)
        )).scalars().all()
        js_all    = (await session.execute(select(JobSkill))).scalars().all()

    # Build lookup maps
    cv_skill_map: dict = {}
    for cvs_lnk in cv_skills:
        cv_skill_map.setdefault(cvs_lnk.cv_id, set()).add(cvs_lnk.skill_id)

    job_db_to_gidx = {j.id: j.graph_node_id for j in jobs
                      if j.graph_node_id is not None}

    job_skill_dict: dict = {}
    if hasattr(graph["job", "requires", "skill"], "edge_attr"):
        for ea in graph["job", "requires", "skill"].edge_attr:
            job_skill_dict.setdefault(ea[0], set()).add(ea[1])

    # Stack all job embeddings for fast hard-negative mining
    job_emb_list = [
        torch.tensor(j.embedding, dtype=torch.float)
        if j.embedding else torch.zeros(settings.EMBEDDING_DIM)
        for j in jobs
    ]
    job_embeddings = torch.stack(job_emb_list)   # [N_job, 384]

    # Build EvalGroup list (one per CV)
    all_groups = []
    for cv in cvs:
        if cv.embedding is None:
            continue

        cv_emb    = torch.tensor(cv.embedding, dtype=torch.float)
        cv_skills_set = cv_skill_map.get(cv.id, set())

        # Positive job: maximum skill overlap
        best_jid, max_overlap = None, -1
        for j in jobs:
            overlap = len(cv_skills_set & job_skill_dict.get(j.id, set()))
            if overlap > max_overlap:
                max_overlap, best_jid = overlap, j.id

        if best_jid is None or best_jid not in job_db_to_gidx:
            best_jid = random.choice(jobs).id

        pos_gidx  = job_db_to_gidx[best_jid]
        hard_negs = build_hard_negatives(pos_gidx, job_embeddings, n_negatives=99)

        all_groups.append((cv_emb, cv_skills_set, pos_gidx, hard_negs))

    # ── Step 5: Train / test split (80 / 20) ──────────────────────────── #
    random.shuffle(all_groups)
    split = int(len(all_groups) * 0.8)
    train_groups = all_groups[:split]
    test_groups  = all_groups[split:]

    # Flatten train groups into individual (pos, 1 neg) pairs for BPR
    train_triplets = []
    for cv_emb, cv_skills_set, pos_gidx, hard_negs in train_groups:
        # Sample ONE hard negative per training step (paper Sec. 4.1)
        neg_gidx = random.choice(hard_negs)
        train_triplets.append((cv_emb, cv_skills_set, pos_gidx, neg_gidx))

    logger.info(
        f"Dataset — Train pairs: {len(train_triplets)} | "
        f"Eval candidates: {len(test_groups)}"
    )

    # ── Step 6: Initialise model ──────────────────────────────────────── #
    node_counts = {
        "job":      graph["job"].x.size(0),
        "skill":    graph["skill"].x.size(0),
        "company":  graph["company"].x.size(0),
        "location": graph["location"].x.size(0),
        "category": graph["category"].x.size(0),
    }

    model = CVConditionedHGAT(
        node_counts=node_counts,
        in_dim=settings.EMBEDDING_DIM,         # 384
        hidden_dim=settings.HGAT_HIDDEN_DIM,   # 128  (H=4, D=32)
        num_heads=settings.HGAT_NUM_HEADS,      # 4
        num_layers=settings.HGAT_NUM_LAYERS,    # 2
        dropout=settings.HGAT_DROPOUT,          # 0.2
    )
    slwg_computer = SLWGComputer()
    trainer = HGATTrainer(
        model,
        graph,
        learning_rate=settings.HGAT_LR,        # 0.001
    )

    param_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
    logger.info(f"Model initialised — {param_count:,} trainable parameters")

    # ── Step 7: Training with best-checkpoint saving ─────────────────── #
    epochs     = max(8, settings.HGAT_EPOCHS)   # at least 8 for convergence
    model_path = os.path.join("models_saved", "hgat_v1.pt")

    logger.info(f"Starting training for {epochs} epoch(s) with best-checkpoint saving…")

    results = trainer.run_training(
        train_triplets=train_triplets,
        eval_groups=test_groups,
        slwg_computer=slwg_computer,
        epochs=epochs,
        batch_size=settings.HGAT_BATCH_SIZE,
        save_path=model_path,
        k_values=[5, 10],
    )

    best = results["best_metrics"]
    logger.info("═" * 60)
    logger.info(f"  Best checkpoint → Epoch {results['best_epoch']}")
    logger.info(f"  HR@5  : {best['HR@5']:.2%}   (target ≥ 38.0%)")
    logger.info(f"  NDCG@5: {best['NDCG@5']:.4f}  (target ≥ 0.238)")
    logger.info(f"  HR@10 : {best['HR@10']:.2%}")
    logger.info(f"  NDCG@10: {best['NDCG@10']:.4f}")
    logger.info("═" * 60)
    logger.info("Training complete! ✓")


# ===========================================================================

if __name__ == "__main__":
    asyncio.run(run_training_pipeline())
