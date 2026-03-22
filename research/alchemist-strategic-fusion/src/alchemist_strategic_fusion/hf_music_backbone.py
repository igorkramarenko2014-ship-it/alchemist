"""
Optional HuggingFace **GPT-2** body for the music stream (Transformers backbone).

Resize token embeddings when `vocab_size` differs from pretrained.
Project `n_embd` → `d_model` when aligning with `StrategicEncoder` / fusion.
"""

from __future__ import annotations

import torch
import torch.nn as nn
from transformers import GPT2Config, GPT2Model


class HFMusicBackbone(nn.Module):
    """
    Forward: token_ids [B, T] → hidden [B, T, d_model]

    Uses SDPA inside HF when PyTorch + GPU allow (Flash/MemoryEfficient).
    """

    def __init__(
        self,
        d_model: int,
        vocab_size: int,
        pretrained: str = "gpt2",
        max_position_embeddings: int = 1024,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        cfg = GPT2Config.from_pretrained(pretrained)
        cfg.max_position_embeddings = max(max_position_embeddings, cfg.max_position_embeddings)
        self.gpt = GPT2Model.from_pretrained(pretrained, config=cfg)
        self.gpt.resize_token_embeddings(vocab_size)
        self.proj = nn.Linear(self.gpt.config.n_embd, d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(
        self,
        music_tokens: torch.Tensor,
        attention_mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        out = self.gpt(input_ids=music_tokens, attention_mask=attention_mask).last_hidden_state
        return self.dropout(self.proj(out))
