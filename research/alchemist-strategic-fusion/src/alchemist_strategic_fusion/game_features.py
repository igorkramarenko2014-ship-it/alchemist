"""
Map raw board tensors → fixed-size feature vectors for StrategicEncoder.

Chess: use parsers_pgn.board_to_feature_vector (960-D).
Go: liberties + simple influence → F_go = 19*19*4 (default) flattened or pooled.
"""

from __future__ import annotations

from typing import List

import numpy as np


def go_stones_to_feature_vector(stone_tensor: np.ndarray) -> np.ndarray:
    """
    stone_tensor: [3, S, S] black, white, empty.

    Channels per cell (stacked flat → S*S*4):
      - b, w, empty (3)
      - liberty count normalized (1) — per stone group approx via local empty adjacency

    Returns
    -------
    np.ndarray [S*S*4]
    """
    assert stone_tensor.shape[0] == 3
    _, s, _ = stone_tensor.shape
    b = stone_tensor[0]
    w = stone_tensor[1]
    emp = stone_tensor[2]
    occupied = (b + w) > 0.5
    lib = np.zeros((s, s), dtype=np.float32)
    for r in range(s):
        for c in range(s):
            if not occupied[r, c]:
                continue
            cnt = 0
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < s and 0 <= nc < s and emp[nr, nc] > 0.5:
                    cnt += 1
            lib[r, c] = min(cnt / 4.0, 1.0)
    # "Influence" proxy: 3x3 blur of stone mass → polyphonic / reverb-tail prior
    inf = np.zeros((s, s), dtype=np.float32)
    for r in range(s):
        for c in range(s):
            acc = 0.0
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < s and 0 <= nc < s:
                        acc += b[nr, nc] + w[nr, nc]
            inf[r, c] = min(acc / 6.0, 1.0)
    stacked = np.stack([b, w, emp, lib], axis=0)  # [4, S, S]
    tail = inf[np.newaxis, ...]
    feat = np.concatenate([stacked, tail], axis=0)  # [5, S, S]
    return feat.reshape(-1).astype(np.float32)


def go_trajectory_to_features(states: List[np.ndarray]) -> np.ndarray:
    """List of [3,S,S] → [T, S*S*5]."""
    return np.stack([go_stones_to_feature_vector(t) for t in states], axis=0)
