"""
Compatibility shim — re-exports from the canonical app.ml.slwg module.

The authoritative implementation lives in ``app/ml/slwg.py``.
This file keeps backward-compatible imports for any code that already uses
``from app.ml.hgat.slwg import SLWGComputer``.
"""
from app.ml.slwg import (  # noqa: F401
    SLWGComputer,
    SLWGBiasResult,
    SLWGAdvisoryResult as SLWGResult,
    OMEGA,
)
