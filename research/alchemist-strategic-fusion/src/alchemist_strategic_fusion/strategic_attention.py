"""
StrategicAttention + AlchemistFusionLayer.

**Fusion contract (cross-attention):**
  Q ← music sequence embeddings  [B, T_music, D]
  K, V ← game memory             [B, T_game, D]

Uses `nn.MultiheadAttention` (batch_first) → internally `F.scaled_dot_product_attention`
on CUDA / ROCm often picks **Flash Attention**-style kernels when dtype/shape allow.
"""

from __future__ import annotations

import torch
import torch.nn as nn


class StrategicAttention(nn.Module):
    """
    Single cross-attention block: music queries game.

    Inputs
    ------
    music : [B, T_m, D]
    game_memory : [B, T_g, D]
    attn_mask : optional broadcastable
    key_padding_mask_game : [B, T_g] bool, True = pad on **game** keys
    """

    def __init__(self, d_model: int, n_heads: int, dropout: float = 0.1) -> None:
        super().__init__()
        self.attn = nn.MultiheadAttention(
            embed_dim=d_model,
            num_heads=n_heads,
            dropout=dropout,
            batch_first=True,
            add_bias_kv=False,
        )

    def forward(
        self,
        music: torch.Tensor,
        game_memory: torch.Tensor,
        key_padding_mask_game: torch.Tensor | None = None,
        attn_mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        # PyTorch 2.x: enable SDPA kernel selection (Flash when available)
        # No-op on CPU; on CUDA improves memory + speed.
        out, _ = self.attn(
            query=music,
            key=game_memory,
            value=game_memory,
            key_padding_mask=key_padding_mask_game,
            attn_mask=attn_mask,
            need_weights=False,
        )
        return out


class AlchemistFusionLayer(nn.Module):
    """
    Pre-norm cross-attention + residual + FFN (musician "plays the game" into the sequence).

    Pipeline
    --------
    1. LayerNorm on Q and KV sides
    2. StrategicAttention (Q=music, KV=game)
    3. Residual on music stream
    4. FFN block on music stream

    Output shape matches **music** time axis: [B, T_music, d_model]
    """

    def __init__(
        self,
        d_model: int,
        n_heads: int,
        dim_feedforward: int | None = None,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        self.ln_m = nn.LayerNorm(d_model)
        self.ln_g = nn.LayerNorm(d_model)
        self.cross = StrategicAttention(d_model, n_heads, dropout)
        self.ln_m2 = nn.LayerNorm(d_model)
        ff = dim_feedforward or 4 * d_model
        self.ffn = nn.Sequential(
            nn.Linear(d_model, ff),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(ff, d_model),
            nn.Dropout(dropout),
        )

    def forward(
        self,
        music_emb: torch.Tensor,
        game_memory: torch.Tensor,
        key_padding_mask_game: torch.Tensor | None = None,
    ) -> torch.Tensor:
        """
        music_emb: [B, T_m, D] — already embedded MIDI / audio tokens
        game_memory: [B, T_g, D] — StrategicEncoder output (+ optional coord PE added there or here)
        """
        q = self.ln_m(music_emb)
        kv = self.ln_g(game_memory)
        x = music_emb + self.cross(q, kv, key_padding_mask_game=key_padding_mask_game)
        x = x + self.ffn(self.ln_m2(x))
        return x


class AlchemistFusionStack(nn.Module):
    """Stack multiple fusion layers (depth on the bridge)."""

    def __init__(self, d_model: int, n_heads: int, n_layers: int, dropout: float = 0.1) -> None:
        super().__init__()
        self.layers = nn.ModuleList(
            [AlchemistFusionLayer(d_model, n_heads, dropout=dropout) for _ in range(n_layers)]
        )

    def forward(
        self,
        music_emb: torch.Tensor,
        game_memory: torch.Tensor,
        key_padding_mask_game: torch.Tensor | None = None,
    ) -> torch.Tensor:
        x = music_emb
        for layer in self.layers:
            x = layer(x, game_memory, key_padding_mask_game=key_padding_mask_game)
        return x
