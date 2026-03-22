# Alchemist Strategic Fusion (research)

**Scope:** PyTorch research code — **not** the Next.js Serum preset pipeline (`apps/web-app`, `shared-engine`).  
**Intent:** Fuse **PGN / SGF** strategic trajectories with **music token** sequences via cross-attention (Q = music, K/V = game memory).

## Install

Use a **venv** with a recent **pip** (editable install needs setuptools + `pyproject.toml` / `setup.cfg`):

```bash
cd research/alchemist-strategic-fusion
python3 -m venv .venv && source .venv/bin/activate
pip install -U pip setuptools wheel
pip install -e ".[dev]"   # or: pip install -e .
```

Smoke (no install): `PYTHONPATH=src python -c "import torch; ..."` after `pip install torch` in that venv.

**Flash Attention 2 / SDPA:** `nn.MultiheadAttention` → `F.scaled_dot_product_attention`; on **CUDA** PyTorch 2.x often picks Flash/Memory-Efficient kernels. Apple Silicon: `export PYTORCH_ENABLE_MPS_FALLBACK=1` if needed.

**HuggingFace:** Optional music backbone in `hf_music_backbone.HFMusicBackbone` (downloads `gpt2` weights on first use).

## Tensor contract (batch-first)

| Tensor | Shape | Role |
|--------|-------|------|
| `game_features` | `[B, T_game, F_game]` | **Chess `F=960`** (`parsers_pgn`); **Go `F=5·S²`** (`game_features.go_stones_to_feature_vector`) |
| `music_tokens` | `[B, T_music]` (long) or `[B, T_music, D_midi]` | MIDI pitch/velocity stream or embedded |
| `game_memory` | `[B, T_game, D]` | `StrategicEncoder` output |
| `fused` | `[B, T_music, D]` | After `AlchemistFusionLayer` |

## Quick sanity

From this directory with deps installed:

```bash
export PYTHONPATH=src
python -m alchemist_strategic_fusion
```

One-liner (same `PYTHONPATH`):

```bash
python -c "from alchemist_strategic_fusion.strategic_encoder import StrategicEncoder; from alchemist_strategic_fusion.strategic_attention import AlchemistFusionLayer; import torch; e=StrategicEncoder(128,256,8,4); f=AlchemistFusionLayer(256,8); g=torch.randn(2,16,128); m=torch.randint(0,512,(2,32)); o=e(g); x=f(m,o); print(o.shape, x.shape)"
```

## Data

Pair **PGN/SGF** files with **tokenized MIDI** (CSV/`.npy` of ints) or use `pretty_midi` (optional extra) to build `StrategicDataset` rows.

## Legal

Research prototype — no warranty. Chess/Go file formats are user-supplied.
