"""
StrategicDataset: aligned (game trajectory, music token sequence) batches.

Expects precomputed `.npy` float32 [T, F] for game and int64 [T_m] for MIDI tokens
(or int16 pitch + velocity packed — here flat token id).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
from torch.utils.data import Dataset


class StrategicDataset(Dataset):
    """
    Each sample: `game_features` [T_g, F], `music_tokens` [T_m] int64, masks.

    `manifest` is a list of dicts:
        { "game": "path/to/features.npy", "music": "path/to/tokens.npy" }

    Padding: right-pad to max lengths inside batch (collate_fn provided).
    """

    def __init__(self, manifest: List[Dict[str, str]], max_game_len: int = 256, max_music_len: int = 512) -> None:
        self.manifest = manifest
        self.max_game_len = max_game_len
        self.max_music_len = max_music_len

    def __len__(self) -> int:
        return len(self.manifest)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        row = self.manifest[idx]
        g = np.load(row["game"])
        m = np.load(row["music"])
        if g.ndim != 2:
            raise ValueError(f"game features must be [T, F], got {g.shape}")
        if m.ndim != 1:
            raise ValueError(f"music tokens must be [T], got {m.shape}")
        g = g[: self.max_game_len].astype(np.float32)
        m = m[: self.max_music_len].astype(np.int64)
        t_g, f = g.shape
        t_m = m.shape[0]
        return {
            "game_features": torch.from_numpy(g),
            "music_tokens": torch.from_numpy(m),
            "game_len": t_g,
            "music_len": t_m,
            "feature_dim": f,
        }


def strategic_collate_fn(batch: List[Dict[str, Any]]) -> Dict[str, torch.Tensor]:
    """Pad variable-length sequences; boolean padding masks True = padded (ignore)."""
    bsz = len(batch)
    f = batch[0]["game_features"].size(-1)
    max_tg = max(x["game_features"].size(0) for x in batch)
    max_tm = max(x["music_tokens"].size(0) for x in batch)

    game = torch.zeros(bsz, max_tg, f, dtype=torch.float32)
    music = torch.zeros(bsz, max_tm, dtype=torch.long)
    game_pad = torch.ones(bsz, max_tg, dtype=torch.bool)
    music_pad = torch.ones(bsz, max_tm, dtype=torch.bool)

    for i, x in enumerate(batch):
        tg = x["game_features"].size(0)
        tm = x["music_tokens"].size(0)
        game[i, :tg] = x["game_features"]
        music[i, :tm] = x["music_tokens"]
        game_pad[i, :tg] = False
        music_pad[i, :tm] = False

    return {
        "game_features": game,
        "music_tokens": music,
        "key_padding_mask_game": game_pad,
        "key_padding_mask_music": music_pad,
    }


def save_manifest_template(path: str | Path) -> None:
    """Write example JSONL for operators."""
    Path(path).write_text(
        '{"game": "data/game_0001.npy", "music": "data/music_0001.npy"}\n',
        encoding="utf-8",
    )
