# Engine Learning Corpus

Pre-production AI learning material for **`@alchemist/shared-engine`** (**Engine School**).

**Documentation triad (keep in sync):** this **`README.md`** (operator) · **`SCHOOL.md`** (architecture) · **`docs/Engine-School-Validation.md`** (outside validation contract) · **`docs/Engine-School-Lesson-Path-Outside-Assessment.md`** (doc sync + lesson path for auditors) · **`docs/Engine-School-Lessons-1-2-Outside-Assessment.md`** (lessons 1–2 assessor snapshot) · **`docs/learning-fitness-implementation-roadmap.md`** (fitness v1→v3 + file-level task plan).

This folder is not a runtime module for the browser. Lessons are **JSON + schema + tests**; live triad routes can consume the **generated index** when opt-in env is set (see **Phase 2**).

**Assistants / token economy:** When **authoring or transforming large lesson JSON, fixtures, or batch files**, use **local Python** under **`~/alchemist-tools/`** per **`.cursor/rules/alchemist-python-economy.mdc`** so work does not burn LLM tokens on huge inline blobs. Shipped pipelines (**`pnpm learning:build-index`**, **`pnpm learning:aggregate-telemetry`**, …) stay **Node**; **in-repo** **`tools/validate-offsets.py`** is the Serum **HARD GATE**, not a general data script.

## One command (clean + verify — you should not need to ask)

If **`pnpm learning:verify`** or **`pnpm verify:harsh`** fails because **`corpus/`** picked up pack debris:

```bash
pnpm learning:sanitize
```

That runs **`learning:forget-presets`** (extension + corpus strict) then **`learning:verify`**. No manual “please delete remains” loop — **CI will also fail** if non-lesson files sit under **`corpus/`**.

**“Lesson 3” in code terms** = the **compressed pedagogy schema** (`priorityMappingKeys`, `coreRules`, `contrastWith`) already required on **lessons 1–2**. A *third* committed JSON file is optional future work, not a separate gate.

## Covenant — squeeze logic, not presets

Engine School **never** redistributes commercial presets, packs, or samples. Authorized committed material is **abstract JSON**: mapping grammar, character, and causal reasoning that humans and models share as **pedagogy**.

**After** you distill logic from private listening or staging work:

1. **Commit only** validated **`corpus/*.json`** (and optional human notes under **`docs/`**).
2. Run **`pnpm learning:forget-presets`** (extension pass + **corpus strict**: only lesson **`*.json`** / optional **`*.md`** / **`.gitkeep`** survive under **`corpus/`**).
3. **Clear `DL/` yourself** when you switch packs or finish a squeeze — the forget script **does not** delete **`DL/`** (local staging only; gitignored).

There are **no** preset binaries in **`corpus/`** by design. If something slipped in, the forget step strips known extensions; **`.nfo`** and similar release metadata are removed too.

## Structure

| Path | Role |
|------|------|
| **`corpus/`** | Durable **`*.json`** lessons validated by **`pnpm learning:verify`** (recursive **`corpus/**/*.json`**). Optional **`.md`** notes are human-only and **not** schema-checked. No vendor pack trees. **Framework exemplars:** **`corpus/engine-school-role-model-v1.json`** (`engine_school_role_model_v1`) — compact transient-first bass squeeze; **`corpus/engine-school-lesson-002-wide-pad-evolution.json`** (`engine_school_lesson_002`) — large wide evolving pad / cinematic bed (many mapping families). Clone either; do not ship vendor binaries. |
| **`docs/lesson-00-role-model.md`** | **Lesson 0** — canonical extraction pattern, four layers, quality bar vs **`lesson.schema.json`**. |
| **`docs/pack-archetype-extraction-sheet.md`** | **Pack archetype extraction sheet** — 3-pass squeeze + master table for operators. |
| **`docs/pack-fingerprints-tier-a.md`** | **Tier-A fingerprints** — one row per trusted pack (Pass 1); operator-filled. |
| **`DL/`** | **Pending downloads / next pack staging.** Drop zips, folders, or `.fxp` here while you work. **`pnpm learning:forget-presets` never reads, deletes, or prunes inside `DL/`.** |
| **`schema/`** | **`lesson.schema.json`** (draft 2020-12, **`x-alchemist-schema-version` `1.2`**). Each lesson sets **`schemaVersion`** to **`"1.1"`** or **`"1.2"`**; optional **`cluster`** (string); optional **`antiPatterns`**, **`difficulty`**, **`heuristics`**, **`contrastMatrix`**, **`lessonVersion`**, **`changelog`**. |

There is **no** separate `presets/` tree. Optional TypeScript helpers may live next to this README.

## Lesson cycle

1. **Stage** the new pack under **`DL/`** only (unpack there if you like).
2. **Author** **`corpus/<id>.json`** with **`"schemaVersion": "1.2"`** (or **`"1.1"`**), **`id`**, **`presetName`** (≥2 chars), **`style`**, **`mappings`** (≥1 key), **`character`** (≥20 chars), **`causalReasoning`** (≥40 chars), **`priorityMappingKeys`** (1–3 keys from `mappings`), **`coreRules`** (2–3 minimal causal strings), **`contrastWith`** (`lessonId` of another corpus lesson + `difference`); optional **`cluster`**, **`tags`**, **`antiPatterns`**, **`difficulty`**, **`heuristics`**, **`contrastMatrix`**, **`lessonVersion`**, **`changelog`**. Clone **`corpus/engine-school-role-model-v1.json`** (tight) or **`corpus/engine-school-lesson-002-wide-pad-evolution.json`** (large dataset), or mirror **`docs/Engine-School-Validation.md`** section 1.
3. **Strip** everything **outside `DL/`** that matches pack artifacts (binaries, pack images, noise txt). **`DL/` is left untouched.**

   ```bash
   LEARNING_FORGET_DRY_RUN=1 pnpm learning:forget-presets
   pnpm learning:forget-presets
   ```

4. **Manually clear or replace** whatever is in **`DL/`** when you move on to the next pack (the script will not do that). The repo keeps **abstract lesson JSON** (mappings + reasoning), not vendor bytes — same as “squeeze logic,” not redistributing packs.
5. **Commit** only **`corpus/*.json`** (and optional human notes) — never `.fxp`, bundle folders, or sidecar files like **`.nfo`** (torrent/pack release noise). Presets used while authoring stay **local**; the repo keeps the **logic squeeze** only.

## Run Lesson (RL) — teach from corpus, then forget

Prints every committed lesson in plain language (good for a classroom walkthrough), then runs **`pnpm learning:forget-presets`** so stray binaries under `learning/` are stripped (**`DL/`** still manual).

```bash
pnpm learning:teach
pnpm learning:rl
```

Teach only (no forget step): `LEARNING_TEACH_SKIP_FORGET=1 pnpm learning:teach`

## Validation

```bash
pnpm learning:verify
```

**Fail-closed** for CI. **Stdout** prints one JSON line (`status` ok|fail). Optional: **`LEARNING_CORPUS_MIN_LESSONS=N`** (default 1). If **`corpus/`** contains any file that is not lesson **`*.json`**, optional **`*.md`**, or **`.gitkeep`**, the validator runs **`learning-forget-presets`** once and rescans (same as manual **`pnpm learning:sanitize`**). To require a clean tree with **no** auto-deletion (e.g. strict tests): **`LEARNING_CORPUS_NO_AUTO_SANITIZE=1`**. Also runs at the end of **`pnpm verify:harsh`**.

**Cloud sync:** Prefer **`corpus/`** with only committed **`*.json`** (use **`DL/`** for staging packs). If sync re-hydrates junk, the validator’s one-shot sanitize usually clears it; for a non-mutating check, set **`LEARNING_CORPUS_NO_AUTO_SANITIZE=1`** or use a non-synced clone.

## Learning index

**`learning-index.json`** is a **generated** artifact (payload **`schemaVersion`**: **`"1.2"`**) that condenses each committed lesson for **prompt enrichment** and **affinity scoring**. Per-lesson rows always include **`id`**, **`style`**, truncated **`character`** / **`causalReasoning`**, **`tags`**, **`mappingKeys`**; the builder also passes through **`priorityMappingKeys`**, **`coreRules`**, **`contrastWith`** when present, optional **`cluster`**, optional **`difficulty`**, **`lessonVersion`**, **`antiPatternCount`**, **`contrastMatrixVs`**, and merges **`fitnessScore`** from **`artifacts/learning-fitness-report.json`** when present. **No** full **`mappings`** values — see **`docs/Engine-School-Validation.md` §8**. It is **not canonical**: full lesson text lives in **`corpus/`** and **`pnpm learning:verify`** stays the gate. **Gitignored** — do not hand-edit or commit it.

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

**Telemetry:** **`triad_run_start`** logs include **`learningContextUsed`** (`injected`, `selectedLessonIds`, **`contextCharCount`**) from the web route. **`triadSessionId`** — one id per **`runTriad`** — may be sent on **`POST /api/triad/*`** JSON bodies and is echoed on **`triad_run_end`** and **`EngineSchoolTelemetryRecord`** JSONL so three panelist calls and Engine School rows line up. With **`ALCHEMIST_LEARNING_CONTEXT=1`**, **`engine_school_influence`** (stderr **`logEvent`**) is emitted when learning telemetry is enabled (**`apps/web-app/env.ts`**): default **on** in development and **Vercel preview** (`VERCEL_ENV=preview`), off in **production** and **`NODE_ENV=test`** unless **`ALCHEMIST_LEARNING_TELEMETRY=1`**; **`ALCHEMIST_LEARNING_TELEMETRY=0`** forces off. Payload includes lesson ids, context size, **`panelistPipeline`** (`rawFromFetcher` → echo audit → **`isValidCandidate`**), **`bestScore`/`meanScore`** on survivors, and **`fullGatePipeline`: `"client_runTriad"`** — Slavic/Undercover + triad merge still run in the browser.

**Structured JSONL (local dev default):** When **`ALCHEMIST_LEARNING_TELEMETRY_FILE=1`**, or **unset** in local **`NODE_ENV=development`** (off on **Vercel** `VERCEL=1`, **production**, **`test`** unless **`=1`**), each **`engine_school_influence`** row is also appended to **`artifacts/learning-telemetry/YYYY-MM-DD.jsonl`** (gitignored). Shape: **`EngineSchoolTelemetryRecord`** in **`apps/web-app/lib/learning-telemetry-jsonl.ts`** — structured fields only (no raw prompts). Override directory: **`ALCHEMIST_LEARNING_TELEMETRY_DIR`** (absolute). **Serverless:** keep file sink off; rely on stderr **`logEvent`** or a writable path.

**Aggregation:** **`pnpm learning:aggregate-telemetry`** reads all **`*.jsonl`** in that folder, computes Fitness v1 per-lesson **`fitnessScore`** / **`fitnessConfidence`** / **`stalenessDays`**, writes **`artifacts/learning-fitness-report.json`** (**`aggregationVersion`**: **3** — includes **`learningOutcomes`**, **`provenance`**, **`uniqueTriadSessions`**, lesson evidence), and merges **`fitnessSnapshot`** into **`learning-index.json`** after **`pnpm learning:build-index`** (**`lessonFitness`** rows are **whitelisted fields only** — no raw telemetry blobs). Evidence is **pre–client-gate** (route validation only). **`pnpm learning:forget-telemetry`** drops shards older than **`LEARNING_TELEMETRY_RETENTION_DAYS`** (default **90**).

**Fitness snapshot (offline v0 + telemetry):** **`pnpm learning:assess-fitness`** runs **static v0** corpus heuristics (**stderr** line, then JSON with **`pipeline`: `static_metadata_v0`**) **then** aggregation. Static-only: `node scripts/learning-assess-fitness.mjs`.

**Not changed:** gate math, blend weights, HARD GATE, corpus validator.

**Selection hygiene (Phase 2b):** meaningful prompt tokens are **length ≥ 3** and exclude a small **stopword** set; **mappingKey** overlap scores **+0.5** (token match only). **Dedup:** same `style` + overlapping `tags` keeps the highest-scoring lesson. **Default cap:** up to **2** lessons per run (override with **`maxLessons`**). **Budget:** `buildLearningContext` caps the **entire** block (advisory lines + lesson lines + end marker) at **800** characters by dropping lowest-ranked lessons, then hard-truncating the last line if needed.

## Phase 3 — corpus-affinity scoring prior (optional)

**Behavior:** After **`filterValid`**, Slavic dedupe (**thresholds unchanged**), and intent blend sort, **`scoreCandidates`** **re-ranks** survivors using **`computeCorpusAffinity`** (deterministic): leaf paths under **`SerumState`** vs lesson **`mappingKeys`** (flexible path/segment match, not only exact string equality), **`priorityMappingKeys`** weighted higher when present, tag/style/**coreRules** word overlap in **`description`/`reasoning`**. When index lessons include telemetry-backed **`fitnessScore`**, affinity is **fitness-weighted** (advisory; gate math unchanged). Sort key is **`baseScore + affinity × effectiveWeight`** — **candidates’ stored `score` is not mutated**; **no** new admissions, **no** gate overrides. **Default base weight `0.08`**.

**Opt-in (server):** Set **`ALCHEMIST_CORPUS_PRIOR=1`** and run **`pnpm learning:build-index`**. The home page uses the server action **`getCorpusScoringLessons()`** so the gitignored index is read on the server only. **`loadLearningIndex`** lives on **`@alchemist/shared-engine/node`** (filesystem) — not on the main **`@alchemist/shared-engine`** entry, so Next client bundles do not pull **`node:fs`**.

**Telemetry:** When the prior runs, **`logEvent("score_candidates", { corpusAffinityApplied, corpusAffinityWeight, corpusAffinityEffectiveWeight, corpusAffinityFitnessWeighted, survivorCount, corpusAffinityLessonCount, corpusAffinityPriorityAware })`** is emitted (fields may be omitted when not applicable).

**Do not confuse with Phase 2:** Corpus affinity is **not** gated by **`ALCHEMIST_LEARNING_CONTEXT`**. That flag is **prompt injection only**. Scoring bias uses **`ALCHEMIST_CORPUS_PRIOR=1`** (web server env) + lessons fed into **`scoreCandidates`** — see **`compute-corpus-affinity.ts`** and **`score.ts`**.

**Do not follow stale “greenfield” prompts:** Never **`import { loadLearningIndex } from "@alchemist/shared-engine"`** inside **`score.ts`** (or any path the Next client bundles): it pulls **`node:fs`** and breaks the build. Index I/O stays on **`@alchemist/shared-engine/node`** or server actions; **`computeCorpusAffinity`** is pure and takes **lesson rows** in memory. Re-implementing “`candidate.score +=`” patches from generic templates **duplicates** shipped logic and risks **gate/order** bugs.

## `learning:forget-presets`

Two passes under `packages/shared-engine/learning/` **except inside `DL/`**:

1. **Extension / noise pass:** preset binaries (`.fxp`, `.fxb`, …), images, **audio/loop/MIDI**, Ableton `.als`, `.pdf`, `.nfo`, OS junk, noisy `IMPORTANT*.txt` / `*ВАЖНО*.txt`, etc.
2. **Corpus strict pass:** under **`corpus/`** only, deletes **every** file that is **not** a lesson **`*.json`**, optional human **`*.md`**, or **`.gitkeep`**. This removes accidental vendor pack trees (instructions, `.rtf`, fonts, leftover anything).

Then prunes empty folders under `corpus/` and `schema/`. **Always skips:** the entire **`DL/`** subtree.

**Env:** `LEARNING_FORGET_DRY_RUN=1` — preview counts; `LEARNING_FORGET_SKIP_CORPUS_STRICT=1` — skip pass 2 (debug only).

**Elsewhere under `learning/`** (not `corpus/`): `README.md`, `schema/`, `docs/`, `*.ts`, etc. are untouched by pass 2 — only **`corpus/`** is allowlisted to JSON/md/gitkeep.

Operators are responsible for lawful use of source material; this command is hygiene for the **learning tree** only — run after a lesson squeeze so **committed** work stays abstract lessons only.

## Learning objective

Given: a preset name + its parameter mappings  
Output: a causal explanation of the sonic character those mappings produce

The engine learns the name → mapping → character chain, not just the output label.
