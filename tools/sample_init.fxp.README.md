# `sample_init.fxp` — HARD GATE validation input

## Purpose

A **real Serum (Xfer Records) init preset** saved as **`.fxp`** is required to run Python offset validation:

- `tools/validate-offsets.py <path-to.fxp>`
- `pnpm validate:offsets` / `pnpm assert:hard-gate` (when this file is at `tools/sample_init.fxp`)

This checks that `packages/fxp-encoder/serum-offset-map.ts` matches bytes from an actual Serum export.

## How to obtain

1. Open **Serum** in your DAW.
2. Open the preset menu → **Init Preset** (or equivalent blank/init patch).
3. **Save preset as…** and choose **`.fxp`** (VST2 preset file).
4. Copy the file to **`tools/sample_init.fxp`** in this monorepo (repo root).

Do **not** commit proprietary preset binaries unless your license allows it. The repo **`.gitignore`** ignores `*.fxp`, so a local copy stays private by default.

## Verify

```bash
pnpm validate:offsets
# or
pnpm assert:hard-gate
```

## CI / strict mode

- **Default:** if the file is **missing**, `pnpm assert:hard-gate` **warns** and exits **0** (local dev friendly).
- **Fail closed:** set **`ALCHEMIST_STRICT_OFFSETS=1`** so missing `tools/sample_init.fxp` exits **1** — use in release pipelines **after** provisioning the file (e.g. secret → write `tools/sample_init.fxp` in CI).

There is **no** placeholder `.fxp` in git: a synthetic or empty file would **not** prove offset correctness.

## Legal / licensing

Export the file **from your own licensed copy of Serum**. Trademarks and plugin licensing are your responsibility; see **`LEGAL.md`**.
