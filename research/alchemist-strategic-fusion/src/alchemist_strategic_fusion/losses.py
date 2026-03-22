"""
Strategic coherence: align **temporal tension** in game memory with tension in fused music.

Not "sounds pretty" alone — penalizes music whose embedding trajectory ignores strategic stress.
"""

from __future__ import annotations

import torch
import torch.nn.functional as F


def strategic_coherence_loss(
    game_memory: torch.Tensor,
    fused_music: torch.Tensor,
    eps: float = 1e-6,
) -> torch.Tensor:
    """
    Parameters
    ----------
    game_memory
        [B, T_game, D] — StrategicEncoder output.
    fused_music
        [B, T_music, D] — after AlchemistFusionLayer(s).

    Returns
    -------
    Scalar loss: MSE between length-aligned **tension curves** (L2 delta norms along time).
    """
    # Tension = ||h[t+1] - h[t]||_2  (logical stress / phase change)
    g = torch.norm(game_memory[:, 1:] - game_memory[:, :-1], dim=-1)  # [B, Tg-1]
    m = torch.norm(fused_music[:, 1:] - fused_music[:, :-1], dim=-1)  # [B, Tm-1]

    b, lg = g.shape
    _, lm = m.shape
    if lg == 0 or lm == 0:
        return torch.tensor(0.0, device=game_memory.device, requires_grad=True)

    g_n = g / (g.amax(dim=-1, keepdim=True).clamp_min(eps))
    m_n = m / (m.amax(dim=-1, keepdim=True).clamp_min(eps))

    if lg != lm:
        # [B, 1, L] → interpolate to lm
        g_sp = F.interpolate(g_n.unsqueeze(1), size=lm, mode="linear", align_corners=False).squeeze(1)
    else:
        g_sp = g_n

    return F.mse_loss(g_sp, m_n)


def next_token_ce(logits: torch.Tensor, targets: torch.Tensor, ignore_index: int = -100) -> torch.Tensor:
    """Standard CE for [B, T, V] logits vs [B, T] targets (optional auxiliary loss)."""
    return F.cross_entropy(logits.reshape(-1, logits.size(-1)), targets.reshape(-1), ignore_index=ignore_index)
