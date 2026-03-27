# Engine School

Pre-production **structured teaching data** for `@alchemist/shared-engine`. It is **not** a browser module. It **does not** change triad **blend weights**, **gate math**, **scoreCandidates**, or **encoder / HARD GATE** law. Optional **read-only** prompt text may be appended on the **server** when **`ALCHEMIST_LEARNING_CONTEXT=1`** (see below).

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
| `README.md` | Day-to-day commands (forget-presets, verify, build-index, enrich-preview, Phase 2 env). |
| `SCHOOL.md` | This file — architecture and boundaries. |
| `scripts/build-learning-index.mjs` | Generates **`learning-index.json`** (gitignored). |
| `load-learning-index.ts` | Node: resolves **`learning-index.json`** (module path, monorepo cwd, or **`ALCHEMIST_LEARNING_INDEX_PATH`**). **`null`** if missing/invalid — never throws. |
| `select-lessons-for-prompt.ts` | Deterministic overlap vs **meaningful** prompt tokens (min length, stopwords); tag/style/mappingKey scoring; dedupe same **style** + overlapping **tags**; top-N. |
| `build-learning-context.ts` | Advisory + descriptive sentinel lines, lesson lines, **≤800** chars total (drop lowest-ranked lessons, then truncate). |
| `learning/index.ts` | Barrel exports for the above. |

## Outside assessment snapshot

**Validated always; consumed optionally.** Lessons are **fail-closed** in CI (**`pnpm learning:verify`** / **`pnpm verify:harsh`**). **Consumption** of the generated index is **opt-in** at runtime: set **`ALCHEMIST_LEARNING_CONTEXT=1`** in **`apps/web-app`** env and ensure **`pnpm learning:build-index`** has been run so **`learning-index.json`** exists. Then **`POST /api/triad/*`** fetchers append the block built by **`loadLearningIndex`** → **`selectLessonsForPrompt`** → **`buildLearningContext`** (see **`apps/web-app/lib/engine-school-triad-context.ts`**) onto **`triadPanelistSystemPrompt`** — **read-only** context, **no** gate or weight mutation.

**Bridges shipped:** (1) **`pnpm learning:build-index`** → **`learning-index.json`**. (2) **Phase 2** live triad enrichment (env-gated) + **`pnpm learning:enrich-preview`** for CLI inspection. **Not shipped:** Phase 3 optional **scoring prior** — see **`docs/Engine-School-Validation.md` §8**.

## Lifecycle

1. Stage material under `DL/` on your machine.
2. Author **`corpus/<id>.json`** with **`schemaVersion`: `"1.0"`** (until the schema bumps), `id`, `presetName`, `style`, non-empty **`mappings`**, `character`, **`causalReasoning`** (see stub `corpus/serum-lesson-000-stub.json`).
3. Run **`pnpm learning:forget-presets`** so stray binaries / audio / PDFs outside `DL/` are removed from `learning/`.
4. Run **`pnpm learning:verify`** (or rely on **`pnpm verify:harsh`**, which runs the same validator).
5. Run **`pnpm learning:build-index`** after corpus edits when using Phase 2 or previews.
6. Commit **lessons + docs**, never `DL/` contents.

## Hooks

- **`pnpm learning:verify`** — `scripts/validate-learning-corpus.mjs` (AJV vs `lesson.schema.json`). **Fail-closed:** any violation → **exit code 1**; **`pnpm verify:harsh`** fails the same way.
- **Stdout** is one **JSON line**: `{"status":"ok",...}` or `{"status":"fail","errors":[...]}` for CI parsers. **Stderr** repeats human-readable lines.
- Optional **`LEARNING_CORPUS_MIN_LESSONS`** (default **`1`**) raises the minimum recursive `**/*.json` count under `corpus/`.
- **`pnpm learning:build-index`** — generates **`learning-index.json`**; **not** part of the fail-closed lesson schema gate unless you add it to CI deliberately (**§8**).
- **`pnpm learning:enrich-preview -- "<prompt>"`** — prints the **would-be** context block (ignores **`ALCHEMIST_LEARNING_CONTEXT`**; needs a built index).
- **Runtime (web-app):** **`ALCHEMIST_LEARNING_CONTEXT=1`** enables append; **`triad_run_start`** may include **`learningContextUsed`** (`injected`, `selectedLessonIds`).

## IOM / coverage

When you add **new TypeScript** that reads lessons, register artifacts in **`igor-power-cells.json`** via the normal **`pnpm igor:heal`** / human **`igor:apply`** flow. Do not silently edit the manifest in agents.

## Legal

You are responsible for rights to any source material used to **author** lessons. The committed product is **abstract JSON** (mappings + text), not shipped `.fxp` or sample libraries.
