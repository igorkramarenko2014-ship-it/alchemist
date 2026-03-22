"""
Quick tensor smoke: `python -m alchemist_strategic_fusion` (from repo: set PYTHONPATH=src).

Requires: torch, numpy (and package imports). Does not download HF weights.
"""

from __future__ import annotations

import sys


def main() -> int:
    try:
        import torch
    except ImportError:
        print("Missing torch. In a venv: pip install torch numpy", file=sys.stderr)
        return 1

    from alchemist_strategic_fusion.losses import strategic_coherence_loss
    from alchemist_strategic_fusion.pipeline import AlchemistStrategicModel

    m = AlchemistStrategicModel(
        game_feature_dim=960,
        vocab_size=512,
        d_model=256,
        n_heads=8,
        encoder_layers=2,
        fusion_layers=2,
    )
    g = torch.randn(2, 20, 960)
    tok = torch.randint(0, 512, (2, 40))
    out = m(g, tok)
    coh = strategic_coherence_loss(out["game_memory"], out["fused_music"])
    print(
        "alchemist_strategic_fusion smoke OK —",
        "fused_music",
        tuple(out["fused_music"].shape),
        "coherence",
        float(coh.detach()),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
