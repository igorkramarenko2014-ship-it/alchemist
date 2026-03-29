# Engine School — Lessons 1–2 (outside assessment)

**Audience:** Third-party assessor, release auditor, or counsel reviewing **what the repository commits** as Engine School “lessons” **1** and **2**, how they are **validated**, and what **legal / product claims** are **not** being made.

**Role in canon:** **`docs/FIRESTARTER.md`**, **`docs/FIRE.md`**, the Serum encoder **HARD GATE**, and TypeScript gates remain **authoritative product law**. This document is **descriptive** — it does not grant lessons authority over gates, blend weights, or encoder bytes.

**Read with:**

| Document | Role |
|----------|------|
| **`docs/Engine-School-Validation.md`** | Fail-closed JSON schema + CI contract for **all** `corpus/**/*.json` |
| **`docs/Engine-School-Lesson-Path-Outside-Assessment.md`** | How lesson authoring meets **`pnpm verify:harsh`** and **`pnpm fire:sync`** |
| **`packages/shared-engine/learning/docs/lesson-00-role-model.md`** | Quality bar (four layers, good vs bad) |
| **`packages/shared-engine/learning/README.md`** | Operator commands, Phase 2/3 opt-in, **`learning:forget-presets`** (corpus strict) |

---

## 1. What “lessons 1–2” are in this repo

Both are **committed JSON files** under **`packages/shared-engine/learning/corpus/`**, **`schemaVersion`: `"1.2"`** (schema **1.2**; **`1.1`** remains accepted for older files), each with an optional **`cluster`** string for affinity / ops, validated by **`pnpm learning:verify`** (also at the end of **`pnpm verify:harsh`**). They are **pedagogical distillates**: abstract **`mappings`** (human-readable control-family prose), **`character`**, and **`causalReasoning`** — **not** shipped Serum preset binaries, not sample libraries, not vendor pack redistribution.

| Label | File | `id` | `style` (summary) | Pedagogical role |
|-------|------|------|-------------------|------------------|
| **Lesson 1 (compact exemplar)** | **`corpus/engine-school-role-model-v1.json`** | **`engine_school_role_model_v1`** | modern aggressive bass | **Transient-first** archetype: punch, short decay, controlled width, restrained modulation — **tighter** mapping surface (**9** top-level mapping keys). Intended as the **minimal** “gold” clone target. |
| **Lesson 2 (large exemplar)** | **`corpus/engine-school-lesson-002-wide-pad-evolution.json`** | **`engine_school_lesson_002`** | cinematic wide evolving pad with controlled motion | **Sustain / evolution** archetype: long envelopes, slow modulation, space, reverb/delay semantics — **wider** mapping surface (**28** top-level keys), including explicit **contrast** to lesson 1 in prose. |

**Field labels:** `presetName` is a **human lesson title** (schema-required string ≥2 chars). Wording states **logic-only, not a vendor preset** — the committed artifact is **not** an assertion of rights to any commercial pack.

**Compressed pedagogy layer (required on every lesson):** **`priorityMappingKeys`**, **`coreRules`**, **`contrastWith`**. Schema **1.1+** adds optional **`antiPatterns`**, **`difficulty`**, **`heuristics`**, **`contrastMatrix`**, **`lessonVersion`**, **`changelog`**. Schema **1.2** adds optional **`cluster`**. Validator enforces subset-of-`mappings`, non-self `contrastWith` / `contrastMatrix.vs`, `antiPatterns.relatedTo` ⊆ `mappings` keys, and duplicate-id rejection.

---

## 2. What the machine guarantees (both lessons)

| Guarantee | Mechanism |
|-----------|-----------|
| Same schema | **`packages/shared-engine/learning/schema/lesson.schema.json`** (`x-alchemist-schema-version` **1.2**; lesson **`schemaVersion`** **`1.1`** or **`1.2`**) |
| No silent skip | **`scripts/validate-learning-corpus.mjs`** walks **`corpus/**/*.json`** recursively |
| Fail-closed CI | Invalid JSON or schema violation → **`pnpm learning:verify`** / **`pnpm verify:harsh`** **exit ≠ 0** |
| Meaningfulness floor | `character` ≥20 chars, `causalReasoning` ≥40 chars, `mappings` ≥1 property (see **`Engine-School-Validation.md` §1**) |
| Pedagogy compression (required) | **`priorityMappingKeys`** ⊆ **`mappings`** keys; **`coreRules`** 2–3 strings; **`contrastWith`** → another corpus **`lessonId`**; duplicate **`id`** rejected (see **`validate-learning-corpus.mjs`**) |

**Not guaranteed by lessons:** correctness of any **authoritative** Serum parameter bytes, WASM export, or triad API behavior — those layers have **separate** gates (encoder **HARD GATE**, **`harshcheck`**, env for live keys).

---

## 3. Hygiene and corpus surface (assessor note)

**Committed `corpus/`** is intended to hold **only** lesson **`*.json`**, optional human **`*.md`**, and **`.gitkeep`**. **`pnpm learning:forget-presets`** runs an **extension pass** plus a **corpus strict pass** that removes any other files under **`corpus/`** (see **`packages/shared-engine/learning/README.md`**). **`DL/`** remains **local staging** (gitignored bulk); operators clear it manually — **not** scanned by the lesson validator.

If historical commits ever contained vendor material under **`learning/`**, that is a **separate** git / legal topic from **current** schema + hygiene behavior described here.

---

## 4. Runtime use (optional, non-authoritative)

When **`pnpm learning:build-index`** is run, a **gitignored** **`learning-index.json`** may summarize lessons for **Phase 2** (prompt context, env **`ALCHEMIST_LEARNING_CONTEXT`**) and **Phase 3** (corpus-affinity **re-rank** weight, env **`ALCHEMIST_CORPUS_PRIOR`**). Neither phase mutates **Slavic / Undercover** gate math or blend weights — see **`packages/shared-engine/learning/README.md`** and **`Engine-School-Validation.md` §8**.

---

## 5. Reproducible checks (lessons 1–2)

From monorepo root:

```bash
pnpm learning:verify
```

Success stdout includes `"validatedFiles":2` when both lesson files are present.

```bash
pnpm learning:teach
```

Prints human-readable lesson text, then runs **`learning:forget-presets`** (unless **`LEARNING_TEACH_SKIP_FORGET=1`**).

---

## 6. Explicit non-claims (lessons 1–2)

- These lessons are **not** proof of licensing clearance for any **external** pack used during **private** authoring.
- They are **not** a substitute for **`serum-offset-map.ts`** validation or **`.fxp`** export authority.
- They do **not** override **`filterValid`**, triad blend weights, or gate thresholds.
- Markdown worksheets under **`packages/shared-engine/learning/docs/`** are **operator guidance** unless separately cited; **JSON + `learning:verify`** are the enforceable lesson surface.

---

## 7. Verdict (quotable — third-party / release)

**Short:**

> **Lessons 1–2** are **two schema-valid, abstract JSON teaching units** at different **data weights** (compact bass vs large pad archetype), checked by the **same** fail-closed validator as the rest of the corpus, with **no** committed vendor binaries when hygiene commands are used as documented; they **do not** replace encoder **HARD GATE** law or TypeScript gate **law**.

**Auditor-friendly (structural hygiene + separation of concerns):**

> Engine School Lessons 1–2 are **properly committed, schema-validated abstract JSON pedagogical artifacts** under **fail-closed CI**, with **explicit non-claims** against authoritative encoder/gate layers and **strong hygiene** separating staging from durable corpus — suitable **pre-production teaching material** in the repository.

---

## 8. Release auditor checklist (reproducible)

| # | Check | Pass criterion |
|---|--------|----------------|
| 1 | Lesson gate | **`pnpm learning:verify`** → stdout **`{"status":"ok",...}`** with **`validatedFiles`** matching committed lesson count |
| 2 | Full monorepo gate | **`pnpm verify:harsh`** exit **0** |
| 3 | Lesson JSON spot-check | Both files under **`corpus/`** include **`mappings`**, **`character`**, **`causalReasoning`**, **`priorityMappingKeys`**, **`coreRules`**, **`contrastWith`**; **`contrastWith.lessonId`** cross-references the other lesson |
| 4 | Runtime opt-ins | Phase 2 / 3 env vars (**`ALCHEMIST_LEARNING_CONTEXT`**, **`ALCHEMIST_CORPUS_PRIOR`**) **default off** in production unless operators enable (advisory / re-rank only — see **`Engine-School-Validation.md` §8**) |
| 5 | Schema bump hygiene | Any **`lesson.schema.json`** / **`schemaVersion`** change updates **`Engine-School-Validation.md`**, this file, and **`lesson-00-role-model.md`** in the **same** change set |

---

**Maintenance:** When the lesson schema version bumps, update **`lesson.schema.json`**, **`docs/Engine-School-Validation.md`**, and this file in the **same** change set. When lesson files are renamed or replaced, update the **table in §1** and the **`validatedFiles`** expectation in §5.
