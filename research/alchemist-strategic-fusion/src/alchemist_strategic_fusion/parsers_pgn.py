"""
PGN ingestion → per-position feature vectors for StrategicEncoder input.

Uses `python-chess`. Output numpy [T, 960] float32 per game.
"""

from __future__ import annotations

from dataclasses import dataclass
from io import StringIO
from pathlib import Path
from typing import List

import chess
import chess.pgn
import numpy as np

_PIECE_INDEX = {
    chess.PAWN: 1,
    chess.KNIGHT: 2,
    chess.BISHOP: 3,
    chess.ROOK: 4,
    chess.QUEEN: 5,
    chess.KING: 6,
}


def _square_control_proxy(board: chess.Board) -> np.ndarray:
    """Shape [64]: crude normalized attack density → maps to "harmonic density" prior."""
    att = np.zeros(64, dtype=np.float32)
    for sq in chess.SQUARES:
        n = len(board.attackers(chess.WHITE, sq)) + len(board.attackers(chess.BLACK, sq))
        att[sq] = min(n / 8.0, 1.0)
    return att


def board_to_feature_vector(board: chess.Board) -> np.ndarray:
    """
    One chess position → vector [960].

    - 64×14 planes: signed piece occupancy (6 white + 6 black channels), side-to-move,
      king-attack stress (double attack / tactical tension proxy).
    - +64 control channel.
    """
    planes = np.zeros((64, 14), dtype=np.float32)
    for sq in chess.SQUARES:
        p = board.piece_at(sq)
        if p is None:
            continue
        base = 0 if p.color == chess.WHITE else 6
        idx = base + _PIECE_INDEX[p.piece_type]
        planes[sq, idx] = 1.0 if p.color == chess.WHITE else -1.0

    stm = 1.0 if board.turn == chess.WHITE else 0.0
    planes[:, 12] = stm
    wk = board.king(chess.WHITE)
    bk = board.king(chess.BLACK)
    w_under = len(board.attackers(chess.BLACK, wk)) if wk is not None else 0
    b_under = len(board.attackers(chess.WHITE, bk)) if bk is not None else 0
    stress = min((w_under + b_under) / 4.0, 1.0)
    planes[:, 13] = stress

    flat = planes.reshape(-1)  # 896
    control = _square_control_proxy(board)
    return np.concatenate([flat, control], axis=0).astype(np.float32)


@dataclass
class PGNTrajectory:
    features: np.ndarray  # [T, 960]


def parse_pgn_all_games(path: str | Path) -> List[PGNTrajectory]:
    """Parse every game in a PGN file; each trajectory is [T, 960]."""
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    pgn_io = StringIO(text)
    games: List[PGNTrajectory] = []
    while True:
        game = chess.pgn.read_game(pgn_io)
        if game is None:
            break
        b = game.board()
        seq = [board_to_feature_vector(b.copy())]
        for mv in game.mainline_moves():
            b.push(mv)
            seq.append(board_to_feature_vector(b.copy()))
        games.append(PGNTrajectory(features=np.stack(seq, axis=0)))
    return games
