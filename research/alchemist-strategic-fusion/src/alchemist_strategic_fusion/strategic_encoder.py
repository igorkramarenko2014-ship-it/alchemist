"""
StrategicEncoder: raw game feature trajectories → game memory [B, T_game, D].

Temporal modeling with TransformerEncoder (self-attn on game time axis).
"""

from __future__ import annotations

import math

import torch
import torch.nn as nn


class StrategicEncoder(nn.Module):
    """
    Parameters
    ----------
    feature_dim : int
        Input F per timestep (chess 960, Go 5*19*19=1805, etc.).
    d_model : int
        Hidden / fusion width (must match AlchemistFusionLayer).
    n_heads : int
    n_layers : int
        TransformerEncoder depth on the **game** sequence.

    Forward
    -------
    x : torch.Tensor [B, T_game, feature_dim]
    key_padding_mask : Optional [B, T_game] True = ignore

    Returns
    -------
    game_memory : [B, T_game, d_model]
    """

    def __init__(
        self,
        feature_dim: int,
        d_model: int,
        n_heads: int,
        n_layers: int,
        dim_feedforward: int | None = None,
        dropout: float = 0.1,
        max_game_len: int = 1024,
    ) -> None:
        super().__init__()
        if d_model % n_heads != 0:
            raise ValueError("d_model must be divisible by n_heads")
        self.feature_dim = feature_dim
        self.d_model = d_model
        self.input_proj = nn.Linear(feature_dim, d_model)
        self.dropout = nn.Dropout(dropout)
        pe = torch.zeros(max_game_len, d_model)
        pos = torch.arange(max_game_len, dtype=torch.float32).unsqueeze(1)
        div = torch.exp(torch.arange(0, d_model, 2, dtype=torch.float32) * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer("temporal_pe", pe.unsqueeze(0))  # [1, max_len, D]

        ff = dim_feedforward or 4 * d_model
        layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=ff,
            dropout=dropout,
            batch_first=True,
            activation="gelu",
            norm_first=True,
        )
        self.encoder = nn.TransformerEncoder(layer, num_layers=n_layers)

    def forward(
        self,
        x: torch.Tensor,
        key_padding_mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        """
        x: [B, T, feature_dim]
        key_padding_mask: [B, T] bool, True = pad (masked)
        """
        b, t, _ = x.shape
        h = self.input_proj(x)
        if t > self.temporal_pe.size(1):
            raise ValueError(f"T_game={t} exceeds max_game_len={self.temporal_pe.size(1)}")
        h = h + self.temporal_pe[:, :t, :]
        h = self.dropout(h)
        return self.encoder(h, src_key_padding_mask=key_padding_mask)
