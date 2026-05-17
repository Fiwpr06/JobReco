"""
Skill Learnability-Weighted Gap (SLWG) Injection — Paper Equations 1 & 2
=========================================================================

Equation 1 — Per-edge bias for job j and skill s conditioned on candidate c:

    b_{js}^{(c)}  =  ω(s)   if  s ∉ S_c   (candidate is missing the skill)
                  =  0       if  s ∈ S_c   (candidate already has the skill)

Equation 2 — Skill learnability weight (domain-knowledge prior, NOT learned):

    ω(s)  =  0.1   if  s ∈ S_easy   (acquirable in weeks)
           =  0.3   if  s ∈ S_medium (acquirable in months)
           =  0.7   if  s ∈ S_hard   (requires years of practice)

The bias tensor is injected into the multi-head attention scoring formula
(Equation 3) as a non-learnable negative term that suppresses attention weight
on edges linking the candidate to skills they do not possess — stronger
suppression for harder-to-learn skills.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

import torch

# ---------------------------------------------------------------------------
# Constants — paper-specified learnability weights
# ---------------------------------------------------------------------------
OMEGA: Dict[str, float] = {
    "easy":   0.1,   # ω for S_easy   — weeks
    "medium": 0.3,   # ω for S_medium — months
    "hard":   0.7,   # ω for S_hard   — years
}

_DEFAULT_OMEGA = OMEGA["medium"]  # fallback when tier is unknown


# ---------------------------------------------------------------------------
# Result containers
# ---------------------------------------------------------------------------

@dataclass
class SLWGBiasResult:
    """
    Returned by SLWGComputer.compute_bias_tensor().
    Used inside the GNN forward pass (Equation 3).
    """
    bias_tensor: torch.Tensor          # shape [E] — one value per job-skill edge
    total_penalty: float               # scalar sum of all bias values


@dataclass
class SLWGAdvisoryResult:
    """
    Returned by SLWGComputer.compute_advisory().
    Used by the API /skills/gaps and /matching endpoints.
    """
    total_penalty: float
    missing_required: List[dict] = field(default_factory=list)
    missing_preferred: List[dict] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Main SLWG class
# ---------------------------------------------------------------------------

class SLWGComputer:
    """
    Stateless helper that implements SLWG gap injection in two modes:

    Mode A — GNN tensor mode (called inside model.forward):
        bias = compute_bias_tensor(cv_skill_ids, skill_tier_tensor)

    Mode B — Advisory mode (called inside API matching endpoint):
        advisory = compute_advisory(cv_skill_ids, job_skill_edge_list)

    The two modes share the same ω lookup table (Equation 2).
    """

    # ------------------------------------------------------------------
    # Mode A: tensor-based, called inside the GNN forward pass
    # ------------------------------------------------------------------

    def compute_bias_tensor(
        self,
        cv_skill_ids: Set[int],
        skill_ids_tensor: torch.Tensor,      # [E] — graph skill node indices
        skill_tier_list: List[str],          # [E] — learnability tier per edge
    ) -> SLWGBiasResult:
        """
        Paper Eq. 1 in vectorised form.

        Parameters
        ----------
        cv_skill_ids:
            Set of *graph-level* skill node IDs that the candidate possesses.
        skill_ids_tensor:
            1-D long tensor of shape [E] with the graph skill index for each
            job → skill edge (destination nodes of 'requires' edges).
        skill_tier_list:
            Parallel list of learnability tier strings for each edge.

        Returns
        -------
        SLWGBiasResult with bias_tensor of shape [E].
        """
        E = skill_ids_tensor.size(0)
        bias = torch.zeros(E, dtype=torch.float)

        for i in range(E):
            sid = int(skill_ids_tensor[i].item())
            if sid not in cv_skill_ids:
                tier = skill_tier_list[i] if i < len(skill_tier_list) else "medium"
                bias[i] = OMEGA.get(tier, _DEFAULT_OMEGA)

        total = float(bias.sum())
        return SLWGBiasResult(bias_tensor=bias, total_penalty=total)

    # ------------------------------------------------------------------
    # Mode B: list-based, called from the API
    # ------------------------------------------------------------------

    def compute_advisory(
        self,
        cv_skill_ids: Set[int],
        job_skill_edges: List[Tuple],     # [(job_id, skill_id, skill_obj, is_required), ...]
    ) -> SLWGAdvisoryResult:
        """
        Compute SLWG penalties and generate rich advisory text for the API.

        Parameters
        ----------
        cv_skill_ids:
            Set of database-level skill IDs the candidate has.
        job_skill_edges:
            List of (job_id, skill_id, skill_obj, is_required) tuples for one
            target job, as stored in ``graph['job','requires','skill'].edge_attr``.

        Returns
        -------
        SLWGAdvisoryResult with penalty breakdown and human-readable advice.
        """
        total_penalty = 0.0
        missing_required: List[dict] = []
        missing_preferred: List[dict] = []

        for job_id, skill_id, skill_obj, is_required in job_skill_edges:
            if skill_id in cv_skill_ids:
                continue  # candidate already has the skill → no bias

            tier = getattr(skill_obj, "learnability_tier", "medium")
            omega = OMEGA.get(tier, _DEFAULT_OMEGA)
            total_penalty += omega

            gap_info = {
                "skill":       skill_obj.name,
                "skill_id":    skill_id,
                "tier":        tier,
                "omega":       omega,
                "slwg_penalty": omega,
                "is_required": is_required,
                "suggestion":  self._suggestion(skill_obj.name, tier),
            }

            if is_required:
                missing_required.append(gap_info)
            else:
                missing_preferred.append(gap_info)

        return SLWGAdvisoryResult(
            total_penalty=total_penalty,
            missing_required=missing_required,
            missing_preferred=missing_preferred,
        )

    # ------------------------------------------------------------------
    # Legacy compatibility shim
    # ------------------------------------------------------------------

    def compute_bias(
        self,
        cv_skill_ids: Set[int],
        job_skill_edges: List[Tuple],
        num_edges: int,
    ) -> "SLWGAdvisoryResult":
        """
        Backward-compatible wrapper kept for routers that call the old API.
        Delegates to compute_advisory().
        """
        return self.compute_advisory(cv_skill_ids, job_skill_edges)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _suggestion(skill_name: str, tier: str) -> str:
        messages = {
            "easy": (
                f"Short Term Action: Highly accessible framework/tool. "
                f"You can acquire '{skill_name}' in 2-3 weeks using documentation "
                f"or brief tutorials to unlock additional jobs immediately."
            ),
            "medium": (
                f"Mid Term Action: '{skill_name}' typically takes 3-6 months of "
                f"hands-on project work or a structured course to master."
            ),
            "hard": (
                f"Long Term Investment: '{skill_name}' is a deep domain competency "
                f"requiring years of engineering practice. Consider roles where you "
                f"can grow this skill gradually, or pursue a certification path."
            ),
        }
        return messages.get(tier, f"Acquire '{skill_name}' through targeted training.")
