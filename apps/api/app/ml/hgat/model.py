"""
CV-Conditioned Heterogeneous Graph Attention Network (HGAT)
============================================================
Paper Equations 3 – 7

Architecture
------------
* 2 message-passing layers (L = 2)
* Multi-head linear attention, H = 4 heads, D = 32 dim per head → hidden = 128
* No LeakyReLU on attention logits (linear GAT variant, as in the paper)
* CV-conditioning term injected directly into attention logit (Eq. 3)
* SLWG non-learnable bias subtracted from attention logit on job→skill edges
* Per-layer, per-node-type LayerNorm + ReLU + Dropout(0.2) after aggregation
* Scoring via cosine similarity (Eq. 7)

Equation Reference
------------------
Eq. 3 — Attention logit (per head h, per edge (i→j)):
    e_{ij}^{(c,h)} = (a_src^h · h_i^h) + (a_tgt^h · h_j^h)
                   + (h_i^h · h_cv^{(c,h)}) + (h_j^h · h_cv^{(c,h)})
                   − b_{ij}^{(c)}

Eq. 4 — Attention coefficient:
    α_{ij}^{(c)} = softmax_j( mean_h[ e_{ij}^{(c,h)} ] )

Eq. 5 — New node embedding after aggregation (per head, concatenated):
    h_j^{new} = concat_h[ Σ_i α_{ij}^{(c)} · (W_src^h · h_i) ]

Eq. 6 — Post-aggregation normalisation:
    h_j^{out} = Dropout( ReLU( LayerNorm( h_j^{new} ) ) )

Eq. 7 — Matching score:
    score(c, j) = cosine( c', h_j )
"""

from __future__ import annotations

from typing import Dict, List, Optional, Set, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.data import HeteroData
from torch_geometric.utils import softmax

from app.ml.slwg import SLWGComputer


# ---------------------------------------------------------------------------
# Default heterogeneous edge schema
# ---------------------------------------------------------------------------
DEFAULT_EDGE_TYPES: List[Tuple[str, str, str]] = [
    ("job",      "requires",    "skill"),
    ("skill",    "required_by", "job"),
    ("job",      "posted_by",   "company"),
    ("company",  "posts",       "job"),
    ("job",      "located_in",  "location"),
    ("location", "has",         "job"),
    ("job",      "belongs_to",  "category"),
    ("category", "contains",    "job"),
    ("job",      "similar_to",  "job"),
]

NODE_TYPES = ["job", "skill", "company", "location", "category"]


# ---------------------------------------------------------------------------
# CV-Conditioned HGAT
# ---------------------------------------------------------------------------

class CVConditionedHGAT(nn.Module):
    """
    2-layer heterogeneous graph attention network conditioned on a
    candidate's CV embedding vector (paper Section 3.2).

    Parameters
    ----------
    node_counts : dict
        Mapping of node type → number of nodes in the graph.
    in_dim : int
        Dimension of the raw input feature vectors (sentence-transformer
        embeddings), default 384.
    hidden_dim : int
        GNN hidden dimension = H × D.  Paper uses H=4, D=32 → hidden=128.
    num_heads : int
        Number of attention heads H.  Paper value: 4.
    num_layers : int
        Number of message-passing layers L.  Paper value: 2.
    dropout : float
        Dropout probability applied after each layer's activation.
    edge_types : list, optional
        Override the default edge schema.
    """

    def __init__(
        self,
        node_counts: Dict[str, int],
        in_dim: int = 384,
        hidden_dim: int = 128,      # H * D = 4 * 32 = 128
        num_heads: int = 4,         # H = 4
        num_layers: int = 2,        # L = 2
        dropout: float = 0.2,
        edge_types: Optional[List[Tuple[str, str, str]]] = None,
    ):
        super().__init__()

        assert hidden_dim % num_heads == 0, (
            f"hidden_dim ({hidden_dim}) must be divisible by num_heads ({num_heads})"
        )

        self.hidden_dim = hidden_dim
        self.num_heads  = num_heads
        self.head_dim   = hidden_dim // num_heads   # D = 32
        self.num_layers = num_layers
        self.edge_types = edge_types or DEFAULT_EDGE_TYPES

        # ------------------------------------------------------------------ #
        # 1. Input projections: in_dim → hidden_dim                           #
        #    CV and Job nodes share the same projection to keep the space      #
        #    consistent (both come from sentence-transformer embeddings).      #
        # ------------------------------------------------------------------ #
        self.cv_proj  = nn.Linear(in_dim, hidden_dim, bias=True)
        self.job_proj = nn.Linear(in_dim, hidden_dim, bias=True)

        # ------------------------------------------------------------------ #
        # 2. Learnable embeddings for non-job node types                       #
        # ------------------------------------------------------------------ #
        self.skill_emb    = nn.Embedding(node_counts.get("skill",    100), hidden_dim)
        self.company_emb  = nn.Embedding(node_counts.get("company",  500), hidden_dim)
        self.location_emb = nn.Embedding(node_counts.get("location", 100), hidden_dim)
        self.category_emb = nn.Embedding(node_counts.get("category",  50), hidden_dim)

        for emb in (self.skill_emb, self.company_emb,
                    self.location_emb, self.category_emb):
            nn.init.normal_(emb.weight, std=0.1)

        # ------------------------------------------------------------------ #
        # 3. Multi-head attention parameters (Eq. 3)                          #
        #    a_src, a_tgt ∈ ℝ^{H×D} — one scalar per head per feature dim    #
        # ------------------------------------------------------------------ #
        self.a_src = nn.Parameter(torch.empty(num_heads, self.head_dim))
        self.a_tgt = nn.Parameter(torch.empty(num_heads, self.head_dim))
        nn.init.xavier_uniform_(self.a_src.unsqueeze(0))
        nn.init.xavier_uniform_(self.a_tgt.unsqueeze(0))

        # ------------------------------------------------------------------ #
        # 4. Per-relation, per-head source and target projection matrices      #
        #    W_src^{h}, W_tgt^{h} ∈ ℝ^{D×hidden_dim} for each edge type      #
        # ------------------------------------------------------------------ #
        edge_key = lambda s, r, t: f"{s}__{r}__{t}"

        # Source projection: hidden_dim → hidden_dim (projects to multi-head space)
        self.W_src = nn.ModuleDict({
            edge_key(s, r, t): nn.Linear(hidden_dim, hidden_dim, bias=False)
            for s, r, t in self.edge_types
        })
        # Target projection
        self.W_tgt = nn.ModuleDict({
            edge_key(s, r, t): nn.Linear(hidden_dim, hidden_dim, bias=False)
            for s, r, t in self.edge_types
        })
        # Output projection after concat across heads
        self.W_out = nn.ModuleDict({
            edge_key(s, r, t): nn.Linear(hidden_dim, hidden_dim, bias=False)
            for s, r, t in self.edge_types
        })

        for md in (self.W_src, self.W_tgt, self.W_out):
            for layer in md.values():
                nn.init.xavier_uniform_(layer.weight)

        # ------------------------------------------------------------------ #
        # 5. Per-layer, per-node-type LayerNorm (Eq. 6)                       #
        # ------------------------------------------------------------------ #
        self.layer_norms = nn.ModuleDict({
            f"layer{l}_{nt}": nn.LayerNorm(hidden_dim)
            for l in range(num_layers)
            for nt in NODE_TYPES
        })

        self.relu    = nn.ReLU()
        self.dropout = nn.Dropout(dropout)

    # ---------------------------------------------------------------------- #
    # Attention computation (Eq. 3)                                           #
    # ---------------------------------------------------------------------- #

    def _attention_logits(
        self,
        h_src: torch.Tensor,   # [E, H, D]
        h_tgt: torch.Tensor,   # [E, H, D]
        h_cv:  torch.Tensor,   # [H, D]
        slwg_bias: torch.Tensor,  # [E]
    ) -> torch.Tensor:
        """
        Eq. 3: e_{ij}^{(c,h)} for all edges and all heads simultaneously.
        Returns shape [E, H].
        """
        # Base GAT term: (a_src^h · h_src^h) + (a_tgt^h · h_tgt^h)  → [E, H]
        base = (self.a_src * h_src).sum(-1) + (self.a_tgt * h_tgt).sum(-1)

        # CV-conditioning term: (h_src^h · h_cv^h) + (h_tgt^h · h_cv^h) → [E, H]
        # h_cv: [H, D] → unsqueeze to [1, H, D] for edge broadcast
        cv_term = (
            (h_src * h_cv.unsqueeze(0)).sum(-1)
            + (h_tgt * h_cv.unsqueeze(0)).sum(-1)
        )

        # Subtract SLWG bias — shape [E] → [E, 1] to broadcast across heads
        e = base + cv_term - slwg_bias.unsqueeze(-1)   # [E, H]
        return e

    # ---------------------------------------------------------------------- #
    # Forward pass                                                            #
    # ---------------------------------------------------------------------- #

    def forward(
        self,
        graph: HeteroData,
        cv_embedding: torch.Tensor,  # [in_dim]  raw sentence-transformer vector
        cv_skill_ids: Set[int],       # graph-level skill node IDs the candidate has
        slwg_computer: SLWGComputer,
    ) -> Tuple[Dict[str, torch.Tensor], torch.Tensor]:
        """
        2-layer heterogeneous GNN forward pass.

        Returns
        -------
        node_embeds : dict[str, Tensor]
            Final node representations, keyed by node type.
        c_prime : Tensor  shape [hidden_dim]
            Projected CV embedding used for scoring (Eq. 7).
        """
        device = cv_embedding.device

        # ── Eq. 5 / 6: Project CV embedding (also used in Eq. 3) ─────────── #
        c_prime = self.cv_proj(cv_embedding)              # [hidden_dim]
        c_prime_heads = c_prime.view(self.num_heads, self.head_dim)  # [H, D]

        # ── Initialise node feature matrices ─────────────────────────────── #
        node_embeds: Dict[str, torch.Tensor] = {
            "job":      self.job_proj(graph["job"].x),   # [N_job, hidden_dim]
            "skill":    self.skill_emb.weight,            # [N_skill, hidden_dim]
            "company":  self.company_emb.weight,
            "location": self.location_emb.weight,
            "category": self.category_emb.weight,
        }

        # ── 2-layer message passing ───────────────────────────────────────── #
        for layer_idx in range(self.num_layers):
            # Accumulators: one aggregated tensor per node type
            agg: Dict[str, torch.Tensor] = {
                nt: torch.zeros_like(emb) for nt, emb in node_embeds.items()
            }
            agg_count: Dict[str, torch.Tensor] = {
                nt: torch.zeros(emb.size(0), device=device)
                for nt, emb in node_embeds.items()
            }

            for src_type, rel, tgt_type in self.edge_types:
                ekey = f"{src_type}__{rel}__{tgt_type}"

                # Skip if edge type absent or empty in this graph
                if (src_type, rel, tgt_type) not in graph.edge_types:
                    continue
                edge_index = graph[src_type, rel, tgt_type].edge_index
                if edge_index.numel() == 0:
                    continue

                src_idx, tgt_idx = edge_index[0], edge_index[1]
                E = src_idx.size(0)

                # ── Project source and target node features ─────────────── #
                h_src_flat = self.W_src[ekey](node_embeds[src_type])[src_idx]  # [E, H*D]
                h_tgt_flat = self.W_tgt[ekey](node_embeds[tgt_type])[tgt_idx]  # [E, H*D]

                # Reshape for multi-head computation: [E, H, D]
                h_src = h_src_flat.view(E, self.num_heads, self.head_dim)
                h_tgt = h_tgt_flat.view(E, self.num_heads, self.head_dim)

                # ── SLWG bias (Eq. 1): non-zero only on job→skill edges ── #
                if (src_type == "job" and rel == "requires"
                        and hasattr(graph["job", "requires", "skill"], "edge_attr")):
                    edge_attr = graph["job", "requires", "skill"].edge_attr
                    # edge_attr is a list of (job_id, skill_id, skill_obj, is_required)
                    # We need: skill_ids_tensor and tier list
                    skill_ids_t = torch.tensor(
                        [ea[1] for ea in edge_attr], dtype=torch.long
                    )
                    tier_list = [
                        getattr(ea[2], "learnability_tier", "medium")
                        for ea in edge_attr
                    ]
                    slwg_res = slwg_computer.compute_bias_tensor(
                        cv_skill_ids, skill_ids_t, tier_list
                    )
                    slwg_bias = slwg_res.bias_tensor.to(device)
                else:
                    slwg_bias = torch.zeros(E, device=device)

                # ── Eq. 3: Attention logits [E, H] ──────────────────────── #
                e = self._attention_logits(h_src, h_tgt, c_prime_heads, slwg_bias)

                # ── Eq. 4: Softmax over incoming edges per target node ───── #
                # Average across heads before softmax (linear GAT variant)
                alpha = softmax(
                    e.mean(-1),                          # [E]
                    tgt_idx,
                    num_nodes=node_embeds[tgt_type].size(0),
                )                                        # [E]

                # ── Eq. 5: Weighted message aggregation ─────────────────── #
                # Messages: α_{ij} * (W_src · h_i) — shape [E, H*D]
                msg = alpha.unsqueeze(-1) * h_src_flat   # [E, hidden_dim]

                N_tgt = node_embeds[tgt_type].size(0)
                agg[tgt_type].scatter_add_(
                    0,
                    tgt_idx.unsqueeze(-1).expand_as(msg),
                    msg,
                )
                agg_count[tgt_type].scatter_add_(
                    0, tgt_idx, torch.ones(E, device=device)
                )

            # ── Eq. 6: LayerNorm → ReLU → Dropout ──────────────────────── #
            for nt in NODE_TYPES:
                if agg_count[nt].sum() > 0:
                    normed = self.layer_norms[f"layer{layer_idx}_{nt}"](agg[nt])
                    node_embeds[nt] = self.dropout(self.relu(normed))

        return node_embeds, c_prime

    # ---------------------------------------------------------------------- #
    # Scoring (Eq. 7)                                                         #
    # ---------------------------------------------------------------------- #

    def score(
        self,
        c_prime: torch.Tensor,  # [hidden_dim]
        h_j: torch.Tensor,      # [hidden_dim] or [M, hidden_dim]
    ) -> torch.Tensor:
        """
        Eq. 7: score(c, j) = cos(c', h_j)

        Works for both a single job vector and a batch of job vectors.
        Returns a scalar or [M] tensor.
        """
        if h_j.dim() == 1:
            # Single job: return scalar
            return F.cosine_similarity(c_prime, h_j, dim=0)
        # Batch: [M, hidden_dim] → [M]
        return F.cosine_similarity(c_prime.unsqueeze(0), h_j, dim=-1)
