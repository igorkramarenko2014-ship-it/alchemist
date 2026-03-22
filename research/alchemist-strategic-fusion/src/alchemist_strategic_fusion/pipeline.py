"""
End-to-end bridge: token embed + (optional) board PE on game stream + encoder + fusion.

Musician **plays a game** by pairing a trajectory file with a MIDI token file in `StrategicDataset`.
"""

from __future__ import annotations

import torch
import torch.nn as nn

from alchemist_strategic_fusion.positional_encoding import sinusoidal_time_pe
from alchemist_strategic_fusion.strategic_attention import AlchemistFusionStack
from alchemist_strategic_fusion.strategic_encoder import StrategicEncoder


class AlchemistStrategicModel(nn.Module):
    """
    Components
    ----------
    - `StrategicEncoder`: [B, T_g, F] → game_memory [B, T_g, D]
    - `music_embed`: nn.Embedding(vocab, D)
    - Game stream: `StrategicEncoder` already adds **temporal** sinusoidal PE. For **per-cell**
      Go sequences, add `BoardCoordinateProjection` outside this class (see README).
    - `AlchemistFusionStack`: cross-attn layers
    - `lm_head`: Linear(D, vocab) for causal / masked LM objective

    Forward returns dict for multi-task loss (coherence + CE).
    """

    def __init__(
        self,
        game_feature_dim: int,
        vocab_size: int,
        d_model: int,
        n_heads: int,
        encoder_layers: int,
        fusion_layers: int,
        max_music_len: int = 1024,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        self.d_model = d_model
        self.encoder = StrategicEncoder(
            feature_dim=game_feature_dim,
            d_model=d_model,
            n_heads=n_heads,
            n_layers=encoder_layers,
            dropout=dropout,
        )
        self.music_embed = nn.Embedding(vocab_size, d_model)
        self.register_buffer("max_music_len_cap", torch.tensor(max_music_len))
        self.fusion = AlchemistFusionStack(d_model, n_heads, fusion_layers, dropout=dropout)
        self.lm_head = nn.Linear(d_model, vocab_size, bias=False)
        self.dropout = nn.Dropout(dropout)

    def forward(
        self,
        game_features: torch.Tensor,
        music_tokens: torch.Tensor,
        key_padding_mask_game: torch.Tensor | None = None,
        key_padding_mask_music: torch.Tensor | None = None,
    ) -> dict[str, torch.Tensor]:
        """
        game_features: [B, T_g, F]
        music_tokens: [B, T_m]
        *_mask: bool True = pad
        """
        _, t_m = music_tokens.shape
        game_mem = self.encoder(game_features, key_padding_mask=key_padding_mask_game)

        w = self.music_embed(music_tokens)
        if t_m > self.max_music_len_cap.item():
            raise ValueError("music sequence too long")
        pe = sinusoidal_time_pe(t_m, self.d_model, music_tokens.device)
        music_h = self.dropout(w + pe)

        fused = self.fusion(music_h, game_mem, key_padding_mask_game=key_padding_mask_game)
        logits = self.lm_head(fused)
        return {"logits": logits, "fused_music": fused, "game_memory": game_mem}
