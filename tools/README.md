# Tools

## `sample_init.fxp` (local only)

See **`sample_init.fxp.README.md`** — export a real Serum init preset to **`tools/sample_init.fxp`** for **`pnpm validate:offsets`** / **`pnpm assert:hard-gate`**. Not committed (`*.fxp` is gitignored).

## validate-offsets.py

Validates a Serum (VST2) init preset `.fxp` against the sourced offset map. **HARD GATE**: run this and fix any mismatches before adding `packages/fxp-encoder/serum-offset-map.ts`.

**Usage**

```bash
python tools/validate-offsets.py /path/to/serum_init.fxp
python tools/validate-offsets.py /path/to/serum_init.fxp --dump-all   # also dump raw first 256 bytes
```

**Sourced map**: `tools/serum_offset_map_sourced.json` — VST2 FXP header (vst2-preset-parser + Vst2xProgram). FxCk = float param array; FPCh = opaque chunk (header only validated; chunk layout not sourced).

**Real init preset**: Export an init/blank preset from Serum as `.fxp` and pass its path. Do not rely on the synthetic `sample_init.fxp` (if present) for final validation.
