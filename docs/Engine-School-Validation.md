# Engine School — Validation Contract

**Audience:** Security review, release audit, or third-party assessor who needs a **precise** picture of how Engine School material is **checked** in this monorepo **before** it affects users.

**Current validation status:** Fully machine-enforced — schema + CI hooks.  
**Last validated:** 2026-03-27 (validator integrated in `pnpm verify:harsh`).

**Role in canon:** **`docs/FIRESTARTER.md`**, **`docs/FIRE.md`**, the Serum encoder **HARD GATE**, and TypeScript gate code remain the **authoritative product law**. Engine School is the **pre-production teaching corpus** under **`@alchemist/shared-engine`**: committed JSON lessons plus operator docs. It is **not** a runtime governor and **never** substitutes those layers.

**Documentation triad (keep in sync):** **`packages/shared-engine/learning/README.md`** (operator) · **`packages/shared-engine/learning/SCHOOL.md`** (architecture) · **`docs/Engine-School-Validation.md`** (this outside contract).

---

## Fail-closed guarantee

**Validation is fail-closed.** Any schema violation, invalid JSON, unreadable corpus path, or count below the minimum lesson threshold causes **`pnpm learning:verify`** and **`pnpm verify:harsh`** to exit **non-zero** and **fail CI** the same as any other verify step. There is no warning-only mode for committed lessons.

---

## 1. What is being validated

| Surface | Rule |
|---------|------|
| **Committed lesson files** | **Every** `*.json` under `packages/shared-engine/learning/corpus/` **recursively** (`corpus/**/*.json`) is validated. There is **no** allowlist and **no** silent skip of JSON files (nested subfolders included). |
| **Schema** | **`packages/shared-engine/learning/schema/lesson.schema.json`** (JSON Schema draft 2020-12). Extension field **`x-alchemist-schema-version`** is **`1.0`** and must match each lesson’s required **`schemaVersion`** property (`const: "1.0"`). |
| **Valid lesson (meaningfulness)** | Required: `schemaVersion`, `id`, `presetName` (≥2 chars), `style`, **`mappings`** (object with **≥1** property), **`character`** (≥20 chars), **`causalReasoning`** (≥40 chars); optional `tags`. Blocks one-line or empty “placeholder” lessons. |
| **Minimum corpus** | Default: **≥1** lesson file. Override with **`LEARNING_CORPUS_MIN_LESSONS`** (integer ≥1). Fewer files than the threshold → **fail** (not a warning). |
| **Automation** | **`scripts/validate-learning-corpus.mjs`**: recursive directory walk, `readFileSync`/`JSON.parse` per file, AJV compile with **`strictSchema: false`** only to allow the documented **`x-alchemist-schema-version`** keyword (lessons themselves stay **`additionalProperties: false`**). |
| **Schema evolution** | Bumping the contract: change **`x-alchemist-schema-version`**, lesson **`schemaVersion` const**, and **all** `corpus/*.json` in one change set. There is **no** auto-migration tool; invalid legacy lessons **fail** until updated. |

Lesson JSON encodes **name → mapping summary → sonic character** with explicit **causal reasoning**. Authoritative Serum bytes remain **`serum-offset-map.ts`** + **`tools/validate-offsets.py`**.

---

## 2. What is explicitly out of scope

| Excluded | Notes |
|----------|--------|
| **`packages/shared-engine/learning/DL/`** | Local staging; **gitignored** except `.gitkeep`. Validator **only** scans **`corpus/`**, not `DL/`. **CI** never sees `DL/`. |
| **Raw `.fxp` in this validator** | **JSON-only.** Preset binaries and WASM follow **FIRESTARTER** / **HARD GATE**. |
| **Live triad / gate weights** | Lessons **do not** mutate blend weights, Slavic/Undercover thresholds, or routes. No such path exists today. If added later, **FIRESTARTER** review entry before ship. |

---

## 3. How to reproduce validation

From the monorepo root:

```bash
pnpm learning:verify
```

**Stdout contract (single JSON object, one line):**

Success:

```json
{"status":"ok","validatedFiles":1,"schemaVersion":"1.0","minLessons":1}
```

Failure (example shape):

```json
{"status":"fail","errors":[{"file":"packages/shared-engine/learning/corpus/bad.json","path":"/mappings","message":"..."}],"schemaVersion":"1.0","minLessons":1,"scannedFiles":2}
```

**Stderr:** human-readable **`[validate-learning-corpus]`** lines (per-file hints). **Exit code:** **0** iff `status === "ok"`, else **1**.

The same script runs at the end of **`pnpm verify:harsh`**. **`pnpm --filter @alchemist/shared-engine test`** runs it via `tests/learning-corpus.schema.test.ts`.

---

## 4. Staging hygiene (after bulk pack drops)

Operators stage under **`learning/DL/`**. **`pnpm learning:forget-presets`** strips pack debris under **`learning/`** except **`DL/`**. Durable lessons live as **`corpus/*.json`** only.

---

## 5. Internal reference

| Doc | Role |
|-----|------|
| **`packages/shared-engine/learning/README.md`** | Lesson cycle, **`learning:forget-presets`**, validation one-liners. |
| **`packages/shared-engine/learning/SCHOOL.md`** | Training scope, IOM growth, legal, hooks detail. |
| **`docs/Engine-School-Validation.md`** | This file — reproducible commands, audit language, **§8** (validation vs inference + recommendations). |

---

## 6. One-sentence verdict you can quote

> Engine School validation **guarantees** that every committed lesson under `corpus/` **matches a versioned JSON Schema**, is **non-placeholder by field rules**, is **fully scanned recursively**, and **fails CI on any violation** — a **contract-grade structural gate**. **DSP, licensing, and runtime ML** stay with the Serum **HARD GATE**, TypeScript gates, and human/legal review.

---

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Unlicensed or sensitive lesson text | Human + legal review; corpus is abstract JSON only. |
| Placeholder lessons | **minLength** / **minProperties** on **`character`**, **`causalReasoning`**, **`mappings`**. |
| Missed JSON files | **Recursive glob-equivalent** walk; no hidden skips under `corpus/`. |
| Schema drift | **Version fields** + same-PR lesson updates; validator asserts **`x-alchemist-schema-version`**. |
| **`DL/` trust** | Never scanned by this tool; not in git. |
| **Inference does not read lessons** | Validated corpus is **static teaching material** until an explicit, reviewed code path consumes it (see **§8**). |

---

## 8. Outside assessment — validation vs inference

**What this contract proves today.** Every committed lesson under **`corpus/`** is **schema-valid**, **meaningful by field rules**, **recursively scanned**, and **fail-closed in CI** via **`pnpm learning:verify`** (also at the end of **`pnpm verify:harsh`**). That is a **structural** guarantee only.

**What is not claimed.** **`runTriad`**, triad routes, system prompts, **`scoreCandidates`**, and TypeScript gates **do not** load lesson JSON or **`learning-index.json`** today. Engine School **does not** mutate blend weights, gate thresholds, or encoder bytes. If a future PR adds consumption, it must be **reviewed** like any other product path and must **not** silently override **FIRESTARTER**, the **HARD GATE**, or gate law in **`shared-engine`**.

**Derived index (phase 1 — implemented).** **`pnpm learning:build-index`** runs **`packages/shared-engine/learning/scripts/build-learning-index.mjs`**, walks the same **`corpus/**/*.json`** tree, and writes **`packages/shared-engine/learning/learning-index.json`** (currently **gitignored**). The file holds **`generatedAtUtc`**, **`schemaVersion`**: **`"1.0"`**, **`lessonCount`**, and per-lesson summaries (**`id`**, **`style`**, truncated **`character`** / **`causalReasoning`**, **`tags`**, **`mappingKeys`** only — **no** mapping values). **Stdout:** one JSON line, e.g. `{"status":"ok","lessonCount":N,"outputPath":"packages/shared-engine/learning/learning-index.json"}`; **exit 1** on failure. **CI** does not require a fresh index today; **`pnpm learning:verify`** remains the **authoritative** gate for committed lessons.

**Truth hierarchy (learning stack).** Committed **`corpus/`** JSON + **`lesson.schema.json`** + **`learning:verify`** → **canonical** for lessons. **`learning-index.json`** is **generated and non-authoritative** — a helper for future prompt packing, **below** that layer and **above** ad hoc prompt text.

**Recommendations (for release / architecture review).**

| Priority | Recommendation |
|----------|----------------|
| **Keep** | Treat **§1–§3** as the audit baseline; re-run **`pnpm learning:verify`** in any PR that touches **`corpus/`** or **`lesson.schema.json`**. |
| **Next (product)** | **Phase 2:** inject **selected** index (or corpus) excerpts into triad **prompt context** only — **no** change to gate math or weights until explicitly specified. |
| **Later (optional)** | **Phase 3:** **optional** corpus-affinity **scoring prior** with gates and **HARD GATE** unchanged; document in **FIRESTARTER** / **FIRE** when shipped. |
| **Policy** | Either **keep the index gitignored** (generate on demand / in deploy prep) **or** commit it and add a **drift check** (regenerate + diff) in CI — pick one policy per release train and document it in **`README.md`**. |
| **CI hygiene (optional)** | Add a **`learning:build-index`** step or “index builds cleanly” assertion to **`verify:harsh`** if you need **reproducible** derived artifacts in release audits. |
| **IOM** | When **TypeScript** reads lessons or the index, register artifacts via **`pnpm igor:heal`** / human **`igor:apply`** — no silent **`igor-power-cells.json`** edits. |
| **Serum bytes** | Any path that maps lessons to **authoritative** preset bytes still requires **`serum-offset-map.ts`** + **`validate-offsets.py`** (**HARD GATE**); Engine School does not replace that. |
