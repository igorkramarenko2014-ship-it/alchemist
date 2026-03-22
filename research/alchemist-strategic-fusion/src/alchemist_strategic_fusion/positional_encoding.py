"""
Positional encodings: music time (sinusoidal) + 2D board coordinates → D_model.

Board coordinates map to embeddings so spatial structure conditions the game memory stream.
"""

from __future__ import annotations

import math

import torch
import torch.nn as nn


def sinusoidal_time_pe(length: int, d_model: int, device: torch.device | None = None) -> torch.Tensor:
    """Shape [1, length, d_model] — ViT/Transformer standard for **music steps**."""
    pe = torch.zeros(length, d_model, device=device)
    pos = torch.arange(length, dtype=torch.float32, device=device).unsqueeze(1)
    div = torch.exp(
        torch.arange(0, d_model, 2, dtype=torch.float32, device=device) * (-math.log(10000.0) / d_model)
    )
    pe[:, 0::2] = torch.sin(pos * div)
    pe[:, 1::2] = torch.cos(pos * div)
    return pe.unsqueeze(0)


class BoardCoordinateProjection(nn.Module):
    """
    Map discrete (row, col) on N×N board to D_model (additive to game tokens).

    Input: `coords` [B, L, 2] int64, each in [0, max_side-1].
    """

    def __init__(self, d_model: int, max_side: int = 19) -> None:
        super().__init__()
        self.d_model = d_model
        d_r = d_model // 2
        d_c = d_model - d_r
        self.row_emb = nn.Embedding(max_side, d_r)
        self.col_emb = nn.Embedding(max_side, d_c)

    def forward(self, coords: torch.Tensor) -> torch.Tensor:
        r = self.row_emb(coords[..., 0].clamp(min=0))
        c = self.col_emb(coords[..., 1].clamp(min=0))
        return torch.cat([r, c], dim=-1)


def ply_coords_time_grid(board_side: int, t_steps: int, device: torch.device) -> torch.Tensor:
    """
    Map ply index t → (t % S, t // S) as pseudo 2D coordinate, shape [1, t_steps, 2] long.
    """
    t = torch.arange(t_steps, device=device)
    r = t % board_side
    c = t // board_side
    return torch.stack([r, c], dim=-1).unsqueeze(0).long()
