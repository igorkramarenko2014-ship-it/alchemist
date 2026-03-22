# Research (Python) — Alchemist

Optional experiments **outside** the TypeScript Serum preset spine (`apps/web-app`, `packages/shared-engine`).  
**Canon for the product:** `docs/FIRESTARTER.md`, `docs/FIRE.md`, `.cursor/rules/alchemist-dsp-vs-ts-gates.mdc`.

| Path | What |
|------|------|
| [`alchemist-strategic-fusion/`](./alchemist-strategic-fusion/) | PGN/SGF + music tokens → `StrategicEncoder`, `AlchemistFusionLayer`, PyTorch |
| [`lava-aji-bridge/`](./lava-aji-bridge/) | Webcam/video → OpenCV blobs/contours → OSC `/alchemist/subtle/*` |

**Cursor:** [`.cursor/rules/alchemist-aji-fluidic.mdc`](../.cursor/rules/alchemist-aji-fluidic.mdc) when editing these trees.

**Smoke (strategic fusion, no editable install):**

```bash
cd alchemist-strategic-fusion && pip install torch numpy transformers python-chess && PYTHONPATH=src python -m alchemist_strategic_fusion
```
