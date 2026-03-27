# Engine Learning Corpus

Pre-production AI learning material for **`@alchemist/shared-engine`** (**Engine School**).

**Documentation triad (keep in sync):** this **`README.md`** (operator) · **`SCHOOL.md`** (architecture) · **`docs/Engine-School-Validation.md`** (outside validation contract).

This folder is not a runtime module for the browser. Lessons are **JSON + schema + tests**; live triad routes can consume the **generated index** when opt-in env is set (see **Phase 2**).

## Structure

| Path | Role |
|------|------|
| **`corpus/`** | Durable **`*.json`** lessons validated by **`pnpm learning:verify`** (recursive **`corpus/**/*.json`**). Optional **`.md`** notes are human-only and **not** schema-checked. No vendor pack trees after cleanup. Stub: **`corpus/serum-lesson-000-stub.json`**. |
| **`DL/`** | **Pending downloads / next pack staging.** Drop zips, folders, or `.fxp` here while you work. **`pnpm learning:forget-presets` never reads, deletes, or prunes inside `DL/`.** |
| **`schema/`** | **`lesson.schema.json`** (draft 2020-12, **`x-alchemist-schema-version` `1.0`**). Each lesson includes **`"schemaVersion": "1.0"`** until the contract bumps. |

There is **no** separate `presets/` tree. Optional TypeScript helpers may live next to this README.

## Lesson cycle

1. **Stage** the new pack under **`DL/`** only (unpack there if you like).
2. **Author** **`corpus/<id>.json`** with **`"schemaVersion": "1.0"`**, **`id`**, **`presetName`** (≥2 chars), **`style`**, **`mappings`** (≥1 key), **`character`** (≥20 chars), **`causalReasoning`** (≥40 chars); optional **`tags`**. Mirror the stub or **`docs/Engine-School-Validation.md`** section 1.
3. **Strip** everything **outside `DL/`** that matches pack artifacts (binaries, pack images, noise txt). **`DL/` is left untouched.**

   ```bash
   LEARNING_FORGET_DRY_RUN=1 pnpm learning:forget-presets
   pnpm learning:forget-presets
   ```

4. **Manually clear or replace** whatever is in **`DL/`** when you move on to the next pack (the script will not do that).
5. **Commit** lessons + docs — not staging downloads.

## Validation

```bash
pnpm learning:verify
```

**Fail-closed** for CI. **Stdout** prints one JSON line (`status` ok|fail). Optional: **`LEARNING_CORPUS_MIN_LESSONS=N`** (default 1). Also runs at the end of **`pnpm verify:harsh`**.

## Learning index

**`learning-index.json`** is a **generated** artifact that condenses committed lessons (`id`, `style`, truncated `character` / `causalReasoning`, `tags`, `mappingKeys` only) for future **prompt enrichment** and **affinity scoring**. It is **not canonical**: full lesson text lives in **`corpus/`** and **`pnpm learning:verify`** stays the gate. **Gitignored** — do not hand-edit or commit it.

```bash
pnpm learning:build-index
```

**Stdout:** one JSON line, e.g. `{"status":"ok","lessonCount":N,"outputPath":"packages/shared-engine/learning/learning-index.json"}`. **Exit 1** if the corpus is missing, unreadable, or lessons fail index checks.

Regenerate after you change committed lessons. Nothing in CI requires this file today; **`pnpm learning:verify`** remains the authoritative gate for committed JSON.

**Outside assessors:** validation vs inference, truth hierarchy, and phased integration recommendations are in **`docs/Engine-School-Validation.md`** (section **8**).

## Phase 2 — prompt enrichment (live triad)

**Behavior:** When **`ALCHEMIST_LEARNING_CONTEXT=1`** is set in **`apps/web-app`** env, each **`POST /api/triad/*`** fetcher appends read-only Engine School text (from **`loadLearningIndex`** → **`selectLessonsForPrompt`** → **`buildLearningContext`**) to **`triadPanelistSystemPrompt`**. **Default is off** so token budgets and behavior stay unchanged until you enable it.

**Setup:**

1. `pnpm learning:build-index` (produces gitignored **`learning-index.json`**).
2. Add **`ALCHEMIST_LEARNING_CONTEXT=1`** to **`.env.local`** (or deploy env).
3. Optional: **`ALCHEMIST_LEARNING_INDEX_PATH`** = absolute path to **`learning-index.json`** if the file is not discoverable from the server cwd (monorepo layout is tried automatically).

**Preview (no env flag):**

```bash
pnpm learning:enrich-preview -- "warm analog pad"
```

**Telemetry:** Existing **`triad_run_start`** logs include **`learningContextUsed`** (`injected`, `selectedLessonIds`) from the web route.

**Not changed:** gate math, blend weights, HARD GATE, corpus validator.

**Selection hygiene (Phase 2b):** meaningful prompt tokens are **length ≥ 3** and exclude a small **stopword** set; **mappingKey** overlap scores **+0.5** (token match only). **Dedup:** same `style` + overlapping `tags` keeps the highest-scoring lesson. **Budget:** `buildLearningContext` caps the **entire** block (advisory lines + lesson lines + end marker) at **800** characters by dropping lowest-ranked lessons, then hard-truncating the last line if needed.

## `learning:forget-presets`

Removes under `packages/shared-engine/learning/` **except inside `DL/`**:

- Preset binaries (`.fxp`, `.fxb`, …), pack images, common **audio/loop/MIDI** debris (`.wav`, `.mp3`, `.mid`, …), Ableton `.als`, pack **`.pdf`** (license sheets), OS junk, noisy `IMPORTANT*.txt` / `*ВАЖНО*.txt`
- Empty directories left under `corpus/` after cleanup (top-level `corpus/` is kept)

**Always skips:** the entire **`DL/`** subtree (pending downloads).

**Keeps / recreates:** `corpus/.gitkeep`, `DL/.gitkeep`, `schema/`, this `README.md`, lesson `.json` / `.md`, `.ts` helpers.

Operators are responsible for lawful use of source material; this command is hygiene for the **learning tree** only.

## Learning objective

Given: a preset name + its parameter mappings  
Output: a causal explanation of the sonic character those mappings produce

The engine learns the name → mapping → character chain, not just the output label.
