# Engine School

Pre-production **structured teaching data** for `@alchemist/shared-engine`. This is **not** a runtime module and **does not** change triad weights, gates, or encoder bytes unless you add an explicit, reviewed code path later.

**Documentation triad (keep in sync):** **`README.md`** (operator) · **`SCHOOL.md`** (this file) · **`docs/Engine-School-Validation.md`** (audit-facing validation contract).

## What “training” means here

| In scope | Out of scope (unless you build it) |
|----------|--------------------------------------|
| Committed **lesson JSON** (`corpus/*.json`): name → mappings → character + **causal reasoning** | Silent ingestion of `.fxp` in production routes |
| **Schema + validator** + **Vitest** so lessons are real test fixtures | A separate ML training service inside this package |
| Documentation that teaches **operators and tests** how presets relate to candidates | Redistribution of commercial sample libraries |

## Layout

| Path | Role |
|------|------|
| `DL/` | Local staging for bulk downloads / unpacks. Gitignored except `.gitkeep`. The forget-presets script never deletes under `DL/`. |
| `corpus/` | **Only** lesson `.json` you intend to commit. Flat files preferred; no vendor trees after cleanup. |
| `schema/lesson.schema.json` | Formal lesson shape (draft 2020-12). **`x-alchemist-schema-version`** (currently **`1.0`**) must match each lesson’s **`schemaVersion`** field. |
| `README.md` | Day-to-day commands (forget-presets, cycle, build-index). |
| `SCHOOL.md` | This file — architecture and boundaries. |
| `scripts/build-learning-index.mjs` | Generates **`learning-index.json`** (gitignored) — see **`docs/Engine-School-Validation.md` §8**. |

## Outside assessment snapshot

**Validated ≠ consumed.** Lessons are **machine-checked** in CI; the **live inference loop** (triad → gates → ranking) **does not** read **`corpus/`** or the index **yet**. That separation is intentional: structural truth first, then an explicit, reviewed bridge.

**First bridge (done).** **`pnpm learning:build-index`** produces a **non-canonical** condensation for future **prompt enrichment** and optional **affinity scoring** — see **`README.md`** (“Learning index”) and **`docs/Engine-School-Validation.md` §8** for the full assessor contract, truth hierarchy, and recommendations.

## Lifecycle

1. Stage material under `DL/` on your machine.
2. Author **`corpus/<id>.json`** with **`schemaVersion`: `"1.0"`** (until the schema bumps), `id`, `presetName`, `style`, non-empty **`mappings`**, `character`, **`causalReasoning`** (see stub `corpus/serum-lesson-000-stub.json`).
3. Run **`pnpm learning:forget-presets`** so stray binaries / audio / PDFs outside `DL/` are removed from `learning/`.
4. Run **`pnpm learning:verify`** (or rely on **`pnpm verify:harsh`**, which runs the same validator).
5. Optionally run **`pnpm learning:build-index`** after corpus edits if you consume **`learning-index.json`** locally or in a prep pipeline.
6. Commit **lessons + docs**, never `DL/` contents.

## Hooks

- **`pnpm learning:verify`** — `scripts/validate-learning-corpus.mjs` (AJV vs `lesson.schema.json`). **Fail-closed:** any violation → **exit code 1**; **`pnpm verify:harsh`** fails the same way.
- **Stdout** is one **JSON line**: `{"status":"ok",...}` or `{"status":"fail","errors":[...]}` for CI parsers. **Stderr** repeats human-readable lines.
- Optional **`LEARNING_CORPUS_MIN_LESSONS`** (default **`1`**) raises the minimum recursive `**/*.json` count under `corpus/`.
- **`pnpm learning:build-index`** — generates **`learning-index.json`**; **not** part of the fail-closed lesson schema gate unless you add it to CI deliberately (**§8** recommendations in **`docs/Engine-School-Validation.md`**).

## IOM / coverage

When you add **new TypeScript** that reads lessons, register artifacts in **`igor-power-cells.json`** via the normal **`pnpm igor:heal`** / human **`igor:apply`** flow. Do not silently edit the manifest in agents.

## Legal

You are responsible for rights to any source material used to **author** lessons. The committed product is **abstract JSON** (mappings + text), not shipped `.fxp` or sample libraries.
