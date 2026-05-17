"""
HGAT Trainer — BPR Loss with 1-positive / 99-hard-negative protocol
=====================================================================
Paper Equation 8 — Bayesian Personalised Ranking (BPR) loss:

    L_BPR = -Σ_{(c, j+, j-)} log σ( score(c, j+) − score(c, j-) )

Training protocol (paper Section 4.1):
  • For every (CV, positive-job) pair, sample 99 hard-negative jobs:
        j-  ∈  top-99 most-similar jobs to j+  that are NOT j+
  • Per gradient step: forward pass on ONE (pos, neg) pair.
  • Evaluation protocol: rank j+ among {j+} ∪ {99 hard negatives} and
    compute HR@K and NDCG@K.

Design decisions:
  • One optimizer.zero_grad() / loss.backward() / optimizer.step() cycle
    *per sample* (not per mini-batch).  This matches the paper's description
    and avoids VRAM issues on CPU-only machines.
  • The SLWGComputer is passed per-call so the trainer is stateless w.r.t.
    graph data — easy to use in both scripts and unit tests.
"""

from __future__ import annotations

import math
import os
import random
from typing import Dict, List, Optional, Set, Tuple

import torch
import torch.optim as optim
from loguru import logger

from app.ml.hgat.model import CVConditionedHGAT
from app.ml.slwg import SLWGComputer


# ---------------------------------------------------------------------------
# Type aliases
# ---------------------------------------------------------------------------

# A training triplet: (cv_embedding, cv_skill_ids, pos_graph_idx, neg_graph_idx)
TrainTriplet = Tuple[torch.Tensor, Set[int], int, int]

# An evaluation group: (cv_embedding, cv_skill_ids, pos_graph_idx, [99 neg idxs])
EvalGroup = Tuple[torch.Tensor, Set[int], int, List[int]]


# ---------------------------------------------------------------------------
# Trainer
# ---------------------------------------------------------------------------

class HGATTrainer:
    """
    Manages training, evaluation, and serialisation of a CVConditionedHGAT model.

    Parameters
    ----------
    model : CVConditionedHGAT
    graph : HeteroData
        The pre-built heterogeneous recruitment graph (``data/graph.pt``).
    learning_rate : float
        Adam learning rate.  Paper uses 0.001.
    weight_decay : float
        L2 regularisation coefficient.
    """

    def __init__(
        self,
        model: CVConditionedHGAT,
        graph,                       # HeteroData — avoid circular import hint
        learning_rate: float = 1e-3,
        weight_decay:  float = 1e-5,
    ):
        self.model  = model
        self.graph  = graph
        self.optimizer = optim.Adam(
            model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay,
        )

    # ---------------------------------------------------------------------- #
    # Training — one epoch                                                    #
    # ---------------------------------------------------------------------- #

    def train_epoch(
        self,
        triplets:      List[TrainTriplet],
        slwg_computer: SLWGComputer,
        batch_size:    int = 16,
    ) -> float:
        """
        Run one training epoch (Eq. 8 — BPR loss).

        Each element of ``triplets`` is a (cv_emb, cv_skills, pos_idx, neg_idx)
        tuple where neg_idx is a *single* hard-negative graph index.

        Returns
        -------
        float
            Mean BPR loss across all samples in this epoch.
        """
        self.model.train()
        random.shuffle(triplets)

        total_loss  = 0.0
        num_samples = 0

        for cv_emb, cv_skills, pos_idx, neg_idx in triplets:
            self.optimizer.zero_grad()

            # Forward pass — full 2-layer GNN conditioned on this CV
            node_embeds, c_prime = self.model(
                self.graph, cv_emb, cv_skills, slwg_computer
            )
            job_embeds = node_embeds["job"]   # [N_job, hidden_dim]

            # Score positive and negative jobs (Eq. 7)
            pos_score = self.model.score(c_prime, job_embeds[pos_idx])  # scalar
            neg_score = self.model.score(c_prime, job_embeds[neg_idx])  # scalar

            # BPR Loss (Eq. 8) — sigmoid cross-entropy on score difference
            loss = -torch.log(torch.sigmoid(pos_score - neg_score) + 1e-8)

            loss.backward()
            self.optimizer.step()

            total_loss  += loss.item()
            num_samples += 1

        return total_loss / max(num_samples, 1)

    # ---------------------------------------------------------------------- #
    # Evaluation — 1-positive / 99-hard-negative protocol                    #
    # ---------------------------------------------------------------------- #

    def evaluate(
        self,
        eval_groups:   List[EvalGroup],
        slwg_computer: SLWGComputer,
        k_values:      List[int] = None,
    ) -> Dict[str, float]:
        """
        Evaluate with the paper's 1-positive / 99-hard-negative protocol.

        For each evaluation group:
          1. Score the positive job and all 99 hard negatives.
          2. Rank them (descending by score).
          3. Compute HR@K and NDCG@K based on the rank of the positive item.

        Parameters
        ----------
        eval_groups : list of EvalGroup
            Each item = (cv_emb, cv_skills, pos_graph_idx, [neg_graph_idx × 99])
        slwg_computer : SLWGComputer
        k_values : list of int, optional
            Cutoffs to evaluate.  Defaults to [5, 10].

        Returns
        -------
        dict
            Keys like "HR@5", "NDCG@5", "HR@10", "NDCG@10".
        """
        if k_values is None:
            k_values = [5, 10]

        self.model.eval()

        hr_acc   = {k: [] for k in k_values}
        ndcg_acc = {k: [] for k in k_values}

        with torch.no_grad():
            for cv_emb, cv_skills, pos_idx, neg_idxs in eval_groups:
                node_embeds, c_prime = self.model(
                    self.graph, cv_emb, cv_skills, slwg_computer
                )
                job_embeds = node_embeds["job"]

                # Pool: positive (index 0) followed by 99 negatives
                eval_pool = [pos_idx] + list(neg_idxs[:99])
                pool_tensor = torch.tensor(eval_pool, dtype=torch.long)

                scores = self.model.score(c_prime, job_embeds[pool_tensor])  # [100]
                ranked = scores.argsort(descending=True).tolist()

                # Rank of the positive item (pool position 0), 1-based
                pos_rank = ranked.index(0) + 1

                for k in k_values:
                    hit = 1.0 if pos_rank <= k else 0.0
                    hr_acc[k].append(hit)

                    # NDCG@K with a single relevant item
                    # NDCG = 1 / log2(rank + 1)  when rank ≤ K, else 0
                    ndcg = (1.0 / math.log2(pos_rank + 1)) if pos_rank <= k else 0.0
                    ndcg_acc[k].append(ndcg)

        metrics: Dict[str, float] = {}
        for k in k_values:
            n = max(len(hr_acc[k]), 1)
            metrics[f"HR@{k}"]   = sum(hr_acc[k])   / n
            metrics[f"NDCG@{k}"] = sum(ndcg_acc[k]) / n

        return metrics

    # ---------------------------------------------------------------------- #
    # Serialisation                                                           #
    # ---------------------------------------------------------------------- #

    def save(self, path: str) -> None:
        """Save model state dict to ``path``."""
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        torch.save(self.model.state_dict(), path)
        logger.info(f"Model weights saved → {path}")

    def load(self, path: str) -> None:
        """Load model state dict from ``path`` (CPU-safe)."""
        state = torch.load(path, map_location="cpu")
        self.model.load_state_dict(state)
        logger.info(f"Model weights loaded ← {path}")

    def run_training(
        self,
        train_triplets: List[TrainTriplet],
        eval_groups:    List[EvalGroup],
        slwg_computer:  SLWGComputer,
        epochs:         int,
        batch_size:     int = 16,
        save_path:      str = "models_saved/hgat_v1.pt",
        k_values:       List[int] = None,
    ) -> Dict[str, object]:
        """
        Full training loop with **best-checkpoint saving** (by NDCG@5).

        Saves the model weights whenever NDCG@5 improves, so the final
        checkpoint on disk is always the best seen — not just the last epoch.

        Returns
        -------
        dict with keys: 'best_epoch', 'best_metrics', 'all_metrics'
        """
        if k_values is None:
            k_values = [5, 10]

        best_ndcg5     = -1.0
        best_epoch     = 0
        best_metrics   = {}
        all_metrics    = []

        for epoch in range(1, epochs + 1):
            loss    = self.train_epoch(train_triplets, slwg_computer, batch_size)
            metrics = self.evaluate(eval_groups, slwg_computer, k_values)
            metrics["loss"]  = loss
            metrics["epoch"] = epoch
            all_metrics.append(metrics)

            logger.info(
                f"Epoch {epoch}/{epochs} | "
                f"BPR Loss: {loss:.4f} | "
                f"HR@5: {metrics['HR@5']:.2%} | "
                f"NDCG@5: {metrics['NDCG@5']:.4f} | "
                f"HR@10: {metrics['HR@10']:.2%} | "
                f"NDCG@10: {metrics['NDCG@10']:.4f}"
            )

            # Save checkpoint whenever NDCG@5 improves
            if metrics["NDCG@5"] > best_ndcg5:
                best_ndcg5   = metrics["NDCG@5"]
                best_epoch   = epoch
                best_metrics = dict(metrics)
                self.save(save_path)
                logger.info(
                    f"  ★ New best NDCG@5={best_ndcg5:.4f} at epoch {epoch} "
                    f"→ checkpoint saved."
                )

        logger.info(
            f"Training finished. Best checkpoint: Epoch {best_epoch} | "
            f"HR@5={best_metrics.get('HR@5', 0):.2%} | "
            f"NDCG@5={best_metrics.get('NDCG@5', 0):.4f}"
        )
        return {
            "best_epoch":   best_epoch,
            "best_metrics": best_metrics,
            "all_metrics":  all_metrics,
        }


# ---------------------------------------------------------------------------
# Hard-negative sampler (utility used by train_hgat.py)
# ---------------------------------------------------------------------------

def build_hard_negatives(
    pos_job_gidx: int,
    job_embeddings: torch.Tensor,   # [N_job, emb_dim]
    n_negatives: int = 99,
) -> List[int]:
    """
    Select the ``n_negatives`` most-similar jobs to the positive job (by cosine
    similarity of text embeddings) that are NOT the positive job itself.

    This implements the hard-negative mining strategy described in Section 4.1
    of the paper.  Using embedding similarity (not graph proximity) keeps the
    sampler fast on CPU for 500 jobs.
    """
    pos_emb = job_embeddings[pos_job_gidx].unsqueeze(0)  # [1, D]
    sims    = torch.nn.functional.cosine_similarity(pos_emb, job_embeddings, dim=-1)

    # Sort descending; skip the positive job's own index
    sorted_idxs = sims.argsort(descending=True).tolist()
    hard_negs   = [idx for idx in sorted_idxs if idx != pos_job_gidx][:n_negatives]

    # Pad to exactly n_negatives if the pool is too small (shouldn't happen)
    all_idxs = list(range(job_embeddings.size(0)))
    while len(hard_negs) < n_negatives:
        cand = random.choice(all_idxs)
        if cand != pos_job_gidx and cand not in hard_negs:
            hard_negs.append(cand)

    return hard_negs
