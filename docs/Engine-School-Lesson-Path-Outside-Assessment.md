# Engine School — Doc sync, lesson path, and outside assessment

**Audience:** Third-party assessor, release auditor, or security reviewer who needs a **single map** of (1) **documentation / metrics sync** and (2) the **committed lesson corpus path**, including how they meet in **`pnpm verify:harsh`**.

**Role in canon:** Product law remains **`docs/FIRESTARTER.md`**, **`docs/FIRE.md`**, the Serum encoder **HARD GATE**, and TypeScript gates. This document is **descriptive** — it does not grant Engine School lessons any authority over gates, blend weights, or encoder bytes.

**Related contracts (read together):**

| Document | Focus |
|----------|--------|
| **`docs/Engine-School-Validation.md`** | Fail-closed **JSON** validation for `learning/corpus/**/*.json` |
| **`docs/learning-fitness-implementation-roadmap.md`** | Fitness v1→v3, aggregator/index/affinity task sequence, tests, optional AIOM outcomes — **implementation backlog**, not product law |
| **`packages/shared-engine/learning/docs/lesson-00-role-model.md`** | Canonical **quality bar** and Lesson 1 program (operator) |
| **`packages/shared-engine/learning/README.md`** | Day-to-day commands (verify, build-index, Phase 2/3 env); **local Python** (`~/alchemist-tools/`, **`.cursor/rules/alchemist-python-economy.mdc`**) for bulk lesson JSON / fixtures to avoid LLM token waste |
| **`docs/Engine-School-Lessons-1-2-Outside-Assessment.md`** | Auditor-facing summary of **committed lessons 1–2** (paths, ids, validation, non-claims) |

---

## 1. Two pipelines (what gets synced vs what gets taught)

### A — Doc sync / truth / metrics (repository truth surface)

These commands refresh **machine-audited** artifacts and docs **after** the code + tests are in a good state.

| Step | Command (repo root) | Primary outputs |
|------|---------------------|-----------------|
| Fast verify | **`pnpm verify:harsh`** | Types, **`shared-engine`** Vitest, **`aggregate-truth.mjs`**, **`validate-truth-matrix.mjs`**, **`validate-fire-metrics.mjs`**, **`validate-learning-corpus.mjs`** (see §3) |
| Full doc sync | **`pnpm fire:sync`** | Initiator skills manifest, **`docs/FIRE.md`** metrics block, **`docs/fire-metrics.json`** (+ sha), **`artifacts/truth-matrix.json`**, **`docs/AIOM-Technical-Brief.md`** sync when applicable, truth-matrix + fire-metrics **validation** |
| Strict bundle | **`pnpm truth:build`** | **`pnpm verify:harsh`** then **`pnpm fire:sync`** (operator “green then refresh docs”) |

**Assessor note:** **`fire:sync`** is **not** a substitute for reading **`docs/FIRESTARTER.md`** for implementation detail. **`FIRE.md`** carries lightweight metrics; **§E** in **`FIRE.md`** describes the metrics block and sync behavior.

### B — Lesson path (Engine School corpus)

| Step | Command / artifact | Role |
|------|----------------------|------|
| Author lessons | **`packages/shared-engine/learning/corpus/**/*.json`** | Committed, schema-validated lessons (abstract mappings + character + **causalReasoning**) |
| Schema | **`packages/shared-engine/learning/schema/lesson.schema.json`** | **`x-alchemist-schema-version` `1.2`** ↔ lesson **`schemaVersion`**: **`"1.1"`** or **`"1.2"`**; optional **`cluster`** |
| Fail-closed gate | **`pnpm learning:verify`** (= **`scripts/validate-learning-corpus.mjs`**) | AJV validation of **every** corpus JSON; optional auto **`learning-forget-presets`** if **`corpus/`** has non-lesson files; stdout one JSON line `{"status":"ok",...}` or fail |
| Generated index (optional runtime) | **`pnpm learning:build-index`** → **`learning-index.json`** (gitignored) | Condensed index (schema **1.2** payload; pedagogy fields + optional **`cluster`** / **`fitnessScore`** — **`Engine-School-Validation.md` §8**) for prompt enrichment / affinity; **not** the canonical lesson text |
| Fitness snapshot (offline) | **`pnpm learning:assess-fitness`** | Static JSON ranking from corpus metadata (**v0**); real coverage uses aggregated **`engine_school_influence`** logs |
| Operator methodology | **`docs/pack-archetype-extraction-sheet.md`**, **`docs/pack-fingerprints-tier-a.md`** | Human-only; **not** CI-validated Markdown |

**Assessor note:** Lessons **do not** ship `.fxp` or assert Serum offsets. Encoder authority stays **`packages/fxp-encoder/serum-offset-map.ts`** + **`tools/validate-offsets.py`** per **HARD GATE**.

---

## 2. Lesson path (ordered, for audit narratives)

Use this order when describing **how** a pack becomes a lesson:

1. **Stage** vendor or research material under **`packages/shared-engine/learning/DL/`** only (gitignored bulk).
2. **Fingerprint / archetype** work per **`docs/pack-archetype-extraction-sheet.md`** (Pass 1–3); Tier-A table in **`docs/pack-fingerprints-tier-a.md`**.
3. **Write** one **`corpus/<lesson-id>.json`** per archetype (or pack-level lesson), following **`lesson-00-role-model.md`**.
4. **Validate** with **`pnpm learning:verify`** (or rely on **`pnpm verify:harsh`**, which invokes the same validator).
5. **Hygiene:** **`pnpm learning:forget-presets`** removes stray binaries/audio outside **`DL/`** under the learning tree (see **`README.md`**).
6. **Optional:** **`pnpm learning:build-index`** for Phase 2 / Phase 3 consumers; index file is **gitignored**.
7. **Optional:** **`pnpm learning:assess-fitness`** for an offline fitness snapshot from corpus fields (not a substitute for log-backed analysis).
8. **Commit** lesson JSON + operator docs — **not** **`DL/`** blobs.

Gold reference lessons: **`packages/shared-engine/learning/corpus/engine-school-role-model-v1.json`** (`engine_school_role_model_v1`) · **`packages/shared-engine/learning/corpus/engine-school-lesson-002-wide-pad-evolution.json`** (`engine_school_lesson_002`).

---

## 3. Where the pipelines meet (single verify chain)

**`pnpm verify:harsh`** (root) ends with validators that touch **truth**, **FIRE metrics**, and **learning corpus** in one run:

- **`node scripts/aggregate-truth.mjs`**
- **`node scripts/validate-truth-matrix.mjs`**
- **`node scripts/validate-fire-metrics.mjs`**
- **`node scripts/validate-learning-corpus.mjs`**

So: **any** invalid lesson JSON **fails the same verify** as typecheck / Vitest failures — there is no separate “soft” path for Engine School.

**Stdout audit:** Successful runs emit **`verify_post_summary`** JSON on stderr (see **`docs/FIRE.md`** / **`RUN.txt`**). Learning corpus success is also summarized by **`validate-learning-corpus.mjs`** stdout line.

---

## 4. Outside assessment checklist (reproducible)

| # | Check | Pass criterion |
|---|--------|----------------|
| 1 | Lesson schema | **`pnpm learning:verify`** → stdout `{"status":"ok",...}` |
| 2 | Full gate | **`pnpm verify:harsh`** exit **0** |
| 3 | Doc metrics honesty | After green verify, **`pnpm fire:sync`** updates **`docs/FIRE.md`** / **`docs/fire-metrics.json`**; **`validate-fire-metrics.mjs`** passes in **`fire:sync`** |
| 4 | Truth matrix | **`artifacts/truth-matrix.json`** consistent with **`validate-truth-matrix.mjs`** (part of verify + fire:sync) |
| 5 | No lesson authority creep | Confirm **`ALCHEMIST_LEARNING_CONTEXT`** / **`ALCHEMIST_CORPUS_PRIOR`** (if used) are **advisory / ordering-only** per **`packages/shared-engine/learning/README.md`** — not gate mutation |
| 6 | Optional telemetry / fitness | With Phase 2 on, **`ALCHEMIST_LEARNING_TELEMETRY=1`** may emit **`engine_school_influence`**; **`pnpm learning:assess-fitness`** is offline metadata only — confirm neither mutates gates or weights |

---

## 5. Explicit non-claims (assessor hygiene)

- Engine School lessons are **pre-production teaching data**, not proof of WASM export, live triad keys, or offset-map correctness.
- **`pnpm fire:sync`** does **not** validate Serum bytes; encoder work remains behind the **HARD GATE** workflow.
- Markdown under **`packages/shared-engine/learning/docs/`** is **operator guidance** unless separately cited as a gated contract; **JSON schema + `learning:verify`** are the enforceable lesson surface.

---

**Document maintenance:** When the lesson schema version bumps, update **`docs/Engine-School-Validation.md`**, **`lesson.schema.json`**, **`packages/shared-engine/learning/scripts/build-learning-index.mjs`** (index **`INDEX_SCHEMA_VERSION`**), and this file’s cross-references in the same change set. When adding new **`pnpm learning:*`** scripts, list them here and in **`packages/shared-engine/learning/README.md`** / **`AGENTS.md`**.
