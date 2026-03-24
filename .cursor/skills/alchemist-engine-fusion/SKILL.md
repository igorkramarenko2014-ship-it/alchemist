---
name: alchemist-engine-fusion
description: >-
  Structures Alchemist Cursor replies using triad-angle synthesis, SOE-style
  health posture, and IOM-aligned audit discipline. Use when the user asks for
  fused reasoning, max output, architecture assessment, release readiness,
  triad/IOM/SOE-aligned answers, or communication that matches shared-engine docs.
---

# Alchemist — engine-fused communication

## What this is

A **response pattern** aligned with **`packages/shared-engine`**, **`iom-pulse.ts`**, and **`docs/brain.md`** — not runtime execution of triad or SOE in chat.

## Preconditions

1. **Canon first:** HARD GATE, `alchemist-brief.mdc`, `alchemist-dsp-vs-ts-gates.mdc`, security — never invert for tone.
2. **No fiction:** Undercover/Slavic/SOE/triad governance = **TypeScript gates and telemetry**; do not describe them as analog saturation DSP or DAW buffer governance.

## Triad-angle synthesis (optional section in replies)

When the question benefits from breadth (architecture, tradeoffs, release, multi-file impact):

| Lens | Ask |
|------|-----|
| Coherence | Does the design/story hold together? Correctness vs product intent? |
| Velocity | CI, routes, keys, WASM, `verify:harsh` / `harshcheck`, deploy hooks? |
| Frugality | Minimum scope, avoid new deps, one path vs three parallel hacks? |

**Then:** one merged **recommendation** (not three redundant paragraphs). In **code/docs**, use wire IDs **LLAMA**, **DEEPSEEK**, **QWEN**; use **ATHENA / HERMES / HESTIA** only as **display/telemetry** labels per repo.

## SOE-style status (one line when useful)

State **posture** in plain language, e.g.:

- **Nominal:** green verify, keys optional path documented, no stub-as-prod claim.
- **Stressed:** WASM stub, partial triad, missing `sample_init.fxp`, selective Vitest only — say so and name the **next verify command**.

Optional **`GET /api/health`** SOE env: **`ALCHEMIST_SOE_*`** — see **`apps/web-app/lib/soe-snapshot-from-env.ts`**.

## IOM

Power manifest = **typed inventory + audit**; **`schisms[]`** = explicit diagnostics — **no** shadow auto-relax of gates from chat suggestions.

## “Max output” definition

More **signal per token**: file paths, commands (`pnpm verify:harsh`, `pnpm harshcheck:wasm`, `pnpm igor:sync --check`), risks, and **what not to do** — not longer filler.

## Doc map

- Law / verify: **`docs/FIRE.md`**, **`docs/FIRESTARTER.md`**
- Brain + flow: **`docs/brain.md`**
- Reviewer shell: **`docs/brain-plus.md`**
- IOM: **`docs/iom.md`**
- Peer tone layer: **`docs/inner-circle-agent.md`** + **`inner-circle-voice`** skill
