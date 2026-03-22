"""
SGF ingestion (Go) — lightweight property + move parser, no heavy deps.

Produces per-move board tensors for liberty / influence features.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np

Coord = Tuple[int, int]  # 0..18, 0..18 for 19x19; support SZ property


def _letter_to_coord(c: str, size: int) -> int:
    if c == "":
        return -1
    # SGF uses a..s for 19x19
    o = ord(c.lower()) - ord("a")
    return min(max(o, 0), size - 1)


@dataclass
class SGFGame:
    board_size: int
    moves: List[Tuple[str, Coord]]  # ("B"|"W", (r,c)) or pass as (-1,-1)


def parse_sgf_file(path: str | Path) -> Optional[SGFGame]:
    """
    Parse a single-game SGF: extract SZ and ;B[dd];W[dd] moves.

    Returns None if no moves found.
    """
    raw = Path(path).read_text(encoding="utf-8", errors="replace")
    sz_m = re.search(r"SZ\[(\d+)\]", raw)
    size = int(sz_m.group(1)) if sz_m else 19

    moves: List[Tuple[str, Coord]] = []
    for m in re.finditer(r";([BW])\[([a-t]{0,2})\]", raw):
        color, coords = m.group(1), m.group(2)
        if len(coords) < 2:
            moves.append((color, (-1, -1)))
        else:
            r, c = _letter_to_coord(coords[0], size), _letter_to_coord(coords[1], size)
            moves.append((color, (r, c)))
    if not moves:
        return None
    return SGFGame(board_size=size, moves=moves)


def replay_to_stones(game: SGFGame) -> List[np.ndarray]:
    """
    Replay moves; return list of black/white occupancy boards after each ply.

    Each board: [3, S, S] float32 — black, white, empty.
    Captures: simplified — only remove direct neighbors with zero liberties (not full Go rules).
    For production training, swap in a full rules engine; this is the tensor bridge.
    """
    s = game.board_size
    states: List[np.ndarray] = []

    black: set[Coord] = set()
    white: set[Coord] = set()

    def neighbors(rc: Coord) -> List[Coord]:
        r, c = rc
        out = []
        for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < s and 0 <= nc < s:
                out.append((nr, nc))
        return out

    def liberties(stones: set[Coord], enemy: set[Coord]) -> int:
        lib = set()
        for rc in stones:
            for n in neighbors(rc):
                if n not in stones and n not in enemy:
                    lib.add(n)
        return len(lib)

    def remove_zero_liberty_groups(for_black: bool) -> None:
        own = black if for_black else white
        other = white if for_black else black
        visited: set[Coord] = set()
        to_remove: set[Coord] = set()
        for rc in list(own):
            if rc in visited:
                continue
            stack = [rc]
            group: set[Coord] = set()
            while stack:
                x = stack.pop()
                if x in group or x not in own:
                    continue
                group.add(x)
                visited.add(x)
                for n in neighbors(x):
                    if n in own:
                        stack.append(n)
            if liberties(group, other) == 0:
                to_remove |= group
        for rc in to_remove:
            own.discard(rc)

    def to_tensor() -> np.ndarray:
        t = np.zeros((3, s, s), dtype=np.float32)
        for r, c in black:
            t[0, r, c] = 1.0
        for r, c in white:
            t[1, r, c] = 1.0
        t[2] = 1.0 - t[0] - t[1]
        return t

    states.append(to_tensor())
    for color, rc in game.moves:
        if rc[0] < 0:
            states.append(to_tensor())
            continue
        if color == "B":
            black.add(rc)
            remove_zero_liberty_groups(False)
        else:
            white.add(rc)
            remove_zero_liberty_groups(True)
        states.append(to_tensor())
    return states
