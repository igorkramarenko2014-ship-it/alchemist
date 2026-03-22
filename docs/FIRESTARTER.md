# FIRESTARTER — Project Alchemist (canonical)

**Path:** `docs/FIRESTARTER.md` (repo root: **Vibe Projects**).  
**Companion:** **`docs/FIRE.md`** — outside assessment, optimisation surface, **§E–§L** contracts (see **Doc logic** below).  
**`docs/` policy:** **`FIRESTARTER.md`**, **`FIRE.md`**, and **`docs/README.md`** (index) hold **product / assessment** truth. **`AGENT-PLAYBOOK.md`** is an **optional** FIRE-aligned agent workflow — **not** canonical law (see **`FIRE.md`** header).  
**Cursor:** **`.cursorrules`** + **`.cursor/rules/alchemist-brief.mdc`** + **`alchemist-dsp-vs-ts-gates.mdc`**.

---

## Doc logic — `FIRESTARTER` vs `FIRE` (two-law split)

| Document | Role |
|----------|------|
| **`FIRESTARTER.md` (this file)** | **Recovery bible** — if other docs are missing, you can **reconstruct the product from this file**: what Alchemist is, monorepo layout, build order, HARD GATE, triad, gates, monitoring, optional modules (arbitration, talent, AGL, taxonomy), web app, verification scripts, WASM, mobile/`vst`, doc index, roadmap, legal summary (**§14**), appendices (workflow, INIT). **Anyone** onboarding or implementing features reads here first. |
| **`FIRE.md`** | **Lightweight outside assessment** — **§E** verify → assess → suggest, **§F–§L** contract tables, **§A–C** invariants. **Machine block:** Vitest counts + Next version between **`ALCHEMIST:FIRE_METRICS`** HTML comments — refresh with **`pnpm fire:sync`** (runs engine tests; optional **`ALCHEMIST_FIRE_SYNC=1`** on **`pnpm harshcheck`** / **`verify:harsh`**). **Auditable hooks:** **`verify_post_summary`** / **`soeHint`** on stderr, SOE (**no** shadow state). **Do not** duplicate FIRESTARTER’s long narrative in FIRE — link sections instead. |

**After a material move:** (1) **This file** — full narrative, tables, INIT if workflows change. (2) **`FIRE.md`** — update **§E–§L** only when **contracts** change (gates, legal, taxonomy rules, etc.); run **`pnpm fire:sync`** after a green verify to refresh the **sync block** (not hand-edited). **Cosmetic / typo-only** may touch one file. **Ship or compliance claims** must reconcile **FIRE** + **FIRESTARTER** §14 + root **`LEGAL.md`**.

---

## 1. What Alchemist is

**Alchemist** turns a **natural-language prompt** (typed or spoken) into **Serum preset candidates**, scored and ranked, with optional **client-side `.fxp` encoding** (Rust→WASM when built) and a path toward a **desktop bridge** (JUCE + sidecar — separate from the TS preset pipeline).

**Web spine:** Prompt → **AI triad** (three panelists) → **Mercury orb** + **PromptAudioDock** → **Export .fxp** when WASM health reports available → ranked candidates in UI.

**Design:** Dark-first — **`#111827`**, **`#5EEAD4`**, flat geometric. **Fail loudly**; **`shared-types`** is schema source of truth.

**Legal & security:** Canonical summary in **§14**; assessment hooks in **`FIRE.md` §G**. Full prose (not legal advice): repo root **`LEGAL.md`**, **`LICENSE`**, **`SECURITY.md`**.

---

## 2. Monorepo layout

| Path | Role |
|------|------|
| `apps/web-app` | Next.js 14 App Router, Tailwind, Mercury UI, `/api/*` triad + health |
| `apps/mobile-app` | Expo (optional; excluded from default typecheck filter) |
| `packages/shared-types` | Canonical TS types (`Panelist`, `AICandidate`, `SerumState` skeleton) |
| `packages/shared-engine` | Triad, gates, encoder export, Vitest; **`taxonomy/`**, **`arbitration/`**, **`perf/`**, **`talent/`**, **`learning/`** (**`mergeGreatLibraryIntoSoeSnapshot`**, AGL boundary — **offline** only) |
| `packages/shared-ui` | Shared React UI pieces |
| `packages/fxp-encoder` | Rust→WASM Serum FXP encoder; **`serum-offset-map.ts`** + skip-if-no-Rust build |
| `tools/` | `validate-offsets.py`, optional `sample_init.fxp` for HARD GATE |
| `research/` | **Optional Python** experiments — **`research/README.md`** (strategic fusion PyTorch, Lava–Aji OSC). **Not** the TS preset / triad / HARD GATE path. |
| `vst/` | Cursor slice — **`package.json`** forwards to root via **`node ../scripts/with-pnpm.mjs`** / **`doctor.mjs`** / **`run-verify-with-summary.mjs`** (not bare **`pnpm`** on PATH). **`packageManager`**: **`pnpm@9.14.2`**, **`engines.node`**: **≥20**. Parent folder **must** contain **`apps/`** + **`packages/`**. |
| `scripts/` | **`with-pnpm.mjs`** (root **`pnpm dev`**, **`harshcheck`**, **`go`**, etc. — falls back to **`npx pnpm@9.14.2`** if **`pnpm`** missing), `go.sh`, **`doctor.mjs`** (`pnpm alc:doctor`), **`run-verify-with-summary.mjs`** ( **`verify_post_summary`**; steps use **`with-pnpm.mjs`**; optional **`ALCHEMIST_FIRE_SYNC=1`** → **`sync-fire-md.mjs`** on green), **`sync-fire-md.mjs`** (**`pnpm fire:sync`** — refresh **`docs/FIRE.md`** metrics block), **`git-save.mjs`** (**`pnpm save`** / **`pnpm git:save`** — stage + commit + push), **`github-first-push.mjs`** (**`pnpm github:first-push`** — add **`origin`** + first **`git push`**), **`recover-web-dev.mjs`**, **`check-no-shadow-patterns.mjs`**, `list-project-docs.sh`, `test-gate-hint.mjs`; **`packages/fxp-encoder/scripts/`** — **`skip-if-no-rust.cjs`**, **`clear-stub-marker.cjs`**, **`sync-maps.cjs`** |

**Package manager:** **pnpm** workspaces. **Node ≥ 20**.

### 2a. Git & GitHub (recovery — read if `git status` looks insane)

| Rule | Detail |
|------|--------|
| **Canonical root** | The folder you open in Cursor / run **`pnpm`** from must contain **`apps/`** and **`packages/`**. If **`git rev-parse --show-toplevel`** prints **`$HOME`** while you are inside the project, you have a mistaken **`~/.git`** — remove it (**`rm -rf ~/.git`**) only if that repo has no commits you need, then **`git init`** in the real project root or **`git clone`** from **`origin`**. |
| **Empty Desktop folders** | A folder with **only** **`.git`** and no **`apps/`** is **not** this monorepo — delete or ignore it; use **`Vibe Projects`** (or your real clone path). |
| **`origin`** | **`git remote -v`** → **`https://github.com/…/alchemist.git`** (or SSH). **`pnpm save`** pushes when **`origin`** exists. |
| **First push** | **`pnpm github:first-push -- "https://github.com/ORG/REPO.git"`** — see **`RUN.txt`**. |
| **HTTPS auth** | **Username** = **personal** GitHub handle (not the org slug). **Password** = **PAT**. Fine-grained PAT: **Resource owner** = **your user**; grant **Contents: Read and write** on the org repo; **Authorize SSO** for the org if required. **`gh auth login`** + **`gh auth setup-git`** avoids fighting prompts. |

---

## 3. Build order (do not skip)

1. **`shared-types`** — `tsc` → `dist/` (**`harshcheck`** builds first).  
2. **`tools/validate-offsets.py`** + validated source.  
3. **`packages/fxp-encoder/serum-offset-map.ts`** — validated vs real Serum init **`.fxp`**.  
4. **`fxp-encoder`** — WASM when Rust present; else skip script.  
5. **`shared-engine`** → **web-app** → **mobile-app** → **vst**.

---

## 4. HARD GATE (encoder / Serum bytes)

- **`serum-offset-map.ts`** **MUST** exist and validate via **`tools/validate-offsets.py`** on a real init **`.fxp`**.  
- **No placeholders. No hallucinated offsets.**  
- No authoritative `.fxp` / `SerumState` fills without this.

**Reminder:** `pnpm test:gate` — prints Python command when `tools/sample_init.fxp` exists. **`pnpm validate:offsets`** and **`pnpm assert:hard-gate`** both run **`tools/validate-offsets.py <tools/sample_init.fxp>`** when the sample exists (the assert script prints an explicit **OK** line on success). Exits **0** with a skip note if the sample is missing unless **`ALCHEMIST_STRICT_OFFSETS=1`** (fail closed for CI / release pipelines). **Do not** run **`validate-offsets.py`** without the **`.fxp`** path argument — the script requires it.

---

## 5. AI Triad (shipped)

**Wire IDs:** **`LLAMA` | `DEEPSEEK` | `QWEN`**.

**`PANELIST_WEIGHTS`** (sum = 1):

| Panelist | Weight | Route |
|----------|--------|--------|
| DEEPSEEK | 0.40 | `/api/triad/deepseek` |
| LLAMA | 0.35 | `/api/triad/llama` |
| QWEN | 0.25 | `/api/triad/qwen` |

**Codenames** (UI + logs only): **DEEPSEEK→ATHENA**, **LLAMA→HERMES**, **QWEN→HESTIA** (`triad-panel-governance.ts`). Logs: **`alchemistCodename`** on `triad_panelist_end`.

**Flow:** Up to **8** candidates → score → gates → discard invalid → UI.

**Timeouts:** **`AI_TIMEOUT_MS` = 8000** per panelist.

**Fetcher:** **`makeTriadFetcher(false, baseUrl)`** → `POST { prompt }`; **`true`** → stubs.

**Prompt guard:** **`validatePromptForTriad`** — max **2000** chars; rejects Markdown code fences.

### 5a. Implementation status (honesty)

| Layer | Reality |
|-------|---------|
| **`POST /api/triad/*`** | Returns **`stubPanelistCandidates`** — **not** live LLM HTTP. Responses include **`x-alchemist-triad-mode: stub`** (and **`x-alchemist-panelist`**). Product gap until one provider is wired with env keys. |
| **`runTriad` + gates** | **Real:** **`AI_TIMEOUT_MS`**, optional **keyword tablebase** (**`reliability/checkers-fusion.ts`**, **`TABLEBASE_RECORDS`** — default **empty**; HARD GATE still governs real preset rows); then **`filterValid`**, distribution + adversarial filters on optional **`paramArray`**; stubs attach synthetic **`paramArray`** so the pipeline is exercised end-to-end. Telemetry: **`preset_tablebase_hit`** on match; **`triad_run_start` / `triad_run_end`** **`mode`**: **`tablebase`** \| **`fetcher`** \| **`stub`**. |
| **`scoreCandidates` (web)** | **Real:** **`filterValid`** (incl. **≥20** char **`reasoning`**), Slavic dedupe (**param** cosine **> 0.92**; when both sides have legible text, also **Dice(bigram) > 0.88** on **`description` || `reasoning`**), preserve score order — used from **`apps/web-app/app/page.tsx`** after triad analysis. |
| **Telemetry** | **`logEvent`** → **stderr JSON** lines (`packages/shared-engine/telemetry.ts`), not dev-only `console.log` for those events. |
| **HARD GATE** | **`serum-offset-map.ts`** + **`validate-offsets.py`** ship in-repo; full Python validation requires a **local** **`tools/sample_init.fxp`** (often gitignored). Use **`pnpm validate:offsets`** / **`pnpm test:gate`**. |
| **Discovery** | **`GET /api/health`** JSON includes **`triad`**, **`hardGate`**, **`telemetry`** summaries for auditors and automations. |

### 5b. Shared-engine — implementation truth (crucial & sane)

This subsection is the **canonical map** of logic shipped in **`packages/shared-engine`**. It complements **§5** (product contract) and **§6** (gate narrative). **Source files:** **`triad.ts`**, **`constants.ts`**, **`validate.ts`**, **`score.ts`**, **`reliability/*`** (tablebase), **`prompt-guard.ts`**, **`encoder.ts`**, **`triad-panel-governance.ts`**, **`triad-monitor.ts`**, **`telemetry.ts`**, plus optional modules in **§7b–§7d**, **§13**.

#### Module responsibilities

| Module | Exports / role |
|--------|----------------|
| **`constants.ts`** | **`MAX_CANDIDATES` = 8**, **`AI_TIMEOUT_MS` = 8000**, **`PANELIST_WEIGHTS`** (DEEPSEEK 0.4, LLAMA 0.35, QWEN 0.25). |
| **`prompt-guard.ts`** | **`TRIAD_PROMPT_MAX_CHARS` = 2000**; **`validatePromptForTriad`** — reject empty, too long, or prompts containing a Markdown code fence (triple backtick). |
| **`triad.ts`** | **`runTriad`**, **`makeTriadFetcher`**, **`stubPanelistCandidates`**, **`TRIAD_PANELISTS`**. Optional **`skipTablebase`**; tablebase hit skips HTTP/stub fetch. Parallel panelist calls; per-call timeout; gates; optional consensus summary. |
| **`reliability/`** | **`tablebase-schema.ts`**, **`tablebase-db.ts`** (empty **`TABLEBASE_RECORDS`** until validated rows land), **`checkers-fusion.ts`** — **`lookupTablebaseCandidate`**, **`findTablebaseRecordForPrompt`**. |
| **`validate.ts`** | **`REASONING_LEGIBILITY_MIN_CHARS` = 20**; **`filterValid`** / **`isValidCandidate`** (**`reasoning`** trimmed length ≥ 20); **Undercover** distribution gate; **Slavic** contextual entropy + variance; **`validateSerumParamArray`** **[0, 1]**; **`consensusValidateCandidate`**, **`filterConsensusValid`**, **`buildValidationSummary`**. |
| **`score.ts`** | **`weightedScore(c)`**; **`cosineSimilarityParamArrays`**; **`SLAVIC_FILTER_COSINE_THRESHOLD` = 0.92**; **`SLAVIC_TEXT_DICE_THRESHOLD` = 0.88**; **`slavicLegibilityText`**, **`diceBigramSimilarity`**; **`slavicFilterDedupe`**; **`scoreCandidates`** = filterValid → dedupe (no redundant re-sort — order preserved from dedupe pass). |
| **`encoder.ts`** | **`encodeFxp(params, programName)`** — dynamic import **`@alchemist/fxp-encoder/wasm`**, **`encode_fxp_fxck`**. Fails loudly if WASM not built. |
| **`triad-panel-governance.ts`** | **`computeTriadGovernance`** — default weights **45% / 35% / 20%** (fidelity / velocity / frugality); **`velocityScoreFromMeanPanelistMs`** (piecewise vs **18_000 ms** and **800 ms**); **`athenaSoeRecalibrationRecommended`** when velocity component **&lt; 0.7**. |
| **`triad-monitor.ts`** | Run / panelist timing; **`logTriadRunStart`**, **`logTriadPanelistEnd`**, **`logTriadRunEnd`**, **`logAthenaSoeRecalibration`**. **`TriadRunMode`**: **`stub`** \| **`fetcher`** \| **`tablebase`**. |
| **`telemetry.ts`** | **`logEvent`** — structured **stderr JSON** lines for auditable events. |

#### Two pipelines (do not conflate)

1. **`runTriad(prompt, options?)`** — **server / orchestration path**  
   - **`validatePromptForTriad`** → throw if rejected.  
   - **Fetcher mode:** `Promise.all` over **`TRIAD_PANELISTS`**; each call wrapped in **`withTimeout(..., AI_TIMEOUT_MS)`** and **`withTriadPanelistTiming`**. On throw/timeout: that panelist contributes **`[]`** and counts as failure for **`triadFailureRate`**.  
   - **Stub mode:** **`stubPanelistCandidates`** per panelist (no HTTP).  
   - **Post-merge gates (in order):** **`filterValid`** → **`candidatePassesDistributionGate`** → **`candidatePassesAdversarial(c, prompt)`** → **`.slice(0, MAX_CANDIDATES)`**.  
   - **Optional:** **`runConsensusValidation`** → per-candidate **`consensusValidateCandidate`** + **`buildValidationSummary`** on **`analysis.validationSummary`**; **`useConsensusFilter`** → **`filterConsensusValid`** then slice again.  
   - **Governance:** **`computeTriadGovernance`** from **`meanPanelistMs`**, **`triadFailureRate`**, **`gateDropRate`**; optional **`logAthenaSoeRecalibration`**.  
   - **`runTriad` does *not* call `scoreCandidates`.** It does **not** apply cosine dedupe; that is **`scoreCandidates`**’s job.

2. **`scoreCandidates(candidates)`** — **client / re-rank path** (e.g. web UI after triad)  
   - **`filterValid`** → **`slavicFilterDedupe`** (sort by **`weightedScore`** desc first; drop if param cosine **&gt; 0.92** vs a kept row **and** (if both have legible **`description` || `reasoning`**) **Dice(bigram)** **&gt; 0.88**; **no** or empty **`paramArray`** → always kept). Output order is already descending by weighted score (**no** second sort).

Stub candidates use **synthetic `paramArray` of length 16** (two distinct patterns in **`stubPanelistCandidates`**) so Undercover + Slavic + cosine paths execute in dev; **full Serum FxCk is 128 floats** when wired from real inference + encoder.

#### `isValidCandidate` / `filterValid` (minimal bar)

- **`score`** ∈ **[0, 1]** (numeric).  
- **`state`** truthy.  
- **`reasoning`** string after trim with length **≥ `REASONING_LEGIBILITY_MIN_CHARS` (20)** — auditable agent explanation, not one-word stubs.  
- **`AICandidate.description`** (optional **`shared-types`**) is used by **`slavicLegibilityText`** when non-empty; else **`reasoning`**.  
- **No** requirement here for **`paramArray`** length or **[0, 1]** range — use **`consensusValidateCandidate`** / **`validateSerumParamArray`** when params must be enforced.

#### Undercover — distribution gate (`passesDistributionGate`)

Only if **`paramArray.length ≥ 8`** (otherwise pass). Then **all** must hold:

| Check | Rule |
|--------|------|
| Mean | **0.2 ≤ mean ≤ 0.8** (inclusive). |
| Edge saturation | Fraction of values **&lt; 0.05** or **&gt; 0.95** ≤ **40%**. |
| Uniqueness | **`uniqueRoundedCents / n ≥ 0.1`** where rounded = **`Math.round(v * 100)`**. |

#### Slavic — adversarial / entropy (`passesAdversarialSanity`)

Only if **`paramArray.length ≥ 8`** (otherwise pass). Else require:

- **Variance** ≥ **`ADVERSARIAL_VARIANCE_MIN` = 0.002** (population variance of the array).  
- **Entropy** ≥ **`entropyMin`**: default **`ADVERSARIAL_ENTROPY_MIN` = 1.5** (Shannon over **10 bins** in **[0,1)**).  

**Contextual floor** via **`getContextualEntropyThreshold(prompt)`** when **`candidatePassesAdversarial(c, prompt)`** is used from **`runTriad`**: regex on **`prompt.toLowerCase()`** — **bass | lead | pluck | key** → **1.2**; **fx | texture | ambient | pad | atmo** → **1.8**; else **1.5**.

#### Consensus / FxCk range

- **`validateSerumParamArray`:** each numeric index **must** be in **[0, 1]**; collects violations.  
- **`consensusValidateCandidate`:** score **[0,1]**; state + **`reasoning`** meeting **`isValidCandidate`** (incl. **≥20** chars trimmed); if **`paramArray`** is present and is an array, runs **`validateSerumParamArray`** and folds violations into result.  
- **`buildValidationSummary`:** human-readable lines per failed candidate (panelist + reasoning + param messages).

#### Weighted score & Slavic dedupe (param + legibility text)

- **`weightedScore(c)`** = **`c.score * (PANELIST_WEIGHTS[c.panelist] ?? 0)`**.  
- **`cosineSimilarityParamArrays(a, b)`** uses **`min(length)`** slice; dot / √(‖a‖²‖b‖²).  
- **`slavicFilterDedupe`:** sort by weighted score desc; for each candidate with non-empty **`paramArray`**, drop if **param** cosine **&gt; 0.92** vs a kept row **and** either (a) legibility text missing/short on either side → **param-only** duplicate rule, or (b) both sides legible → require **Dice(bigram)** **&gt; `SLAVIC_TEXT_DICE_THRESHOLD` (0.88)** to count as duplicate (same knobs, different **reasoning** → may **keep** both). **Not** transformer embeddings — deterministic string geometry only (**`FIRE.md`** snapshot).

#### Encoder contract

- **`encodeFxp`** loads WASM once; calls **`encode_fxp_fxck`**. **HARD GATE** (**§4**) still governs **authoritative byte layout** in **`serum-offset-map.ts`** + **`validate-offsets.py`**; the engine does not re-validate FXP layout after encode.

#### Sanity rules for agents / external LLMs

- Do **not** describe **`validate.ts` / `score.ts`** gates as analog **DSP** (see **`.cursor/rules/alchemist-dsp-vs-ts-gates.mdc`**).  
- Changing thresholds (**0.92**, **0.002**, **1.5**, distribution bands) is a **product** change — update **tests** (**`undercover-slavic.test.ts`**, **`engine-harsh.test.ts`**, etc.) and **§5b / §6** together.  
- **`PANELIST_WEIGHTS`** and **`TRIAD_PANELISTS`** order must stay aligned with **`/api/triad/*`** and docs (**§5**).

---

## 6. Quality gates (TypeScript — not VST DSP)

**Implementation detail:** exact constants, formulas, and the **`runTriad` vs `scoreCandidates`** split are in **§5b** (`packages/shared-engine`).

**Undercover CAI:** `validate.ts` — distribution (mean **[0.2,0.8]**, edge ≤**40%**, uniqueness ≥**0.1**).

**Slavic / adversarial:** **`getContextualEntropyThreshold`**, **`candidatePassesAdversarial`**, **`slavicFilterDedupe`** — **param** cosine **0.92** (**`SLAVIC_FILTER_COSINE_THRESHOLD`**) plus, when both rows have legible **`description` || `reasoning`**, **Dice(bigram)** **0.88** (**`SLAVIC_TEXT_DICE_THRESHOLD`**) — **`slavicFilterDedupe`** takes **one** argument (candidates array).

**Shipped semantics:** Dedupe is **param-first** (Serum-style vectors) with a **deterministic** text tie-break on legible **`description` || `reasoning`** — **not** transformer embeddings. **`filterValid`** / **`isValidCandidate`** require **`reasoning`** length **≥ 20** (**`REASONING_LEGIBILITY_MIN_CHARS`**). A future **optional** path (e.g. description embeddings + a second dedupe stage) would be **additive** and would need its own bundle / latency budget and **`shared-types`** review — **not** implied today.

**Taxonomy bridge:** **`taxonomy/engine.ts`** reuses **`scoreCandidates`** for the same validation + Slavic path; see **§13** and **`FIRE.md` §H**.

**Rule:** Names are **preset statistics**, not analog saturation / resonant filters. **`.cursor/rules/alchemist-dsp-vs-ts-gates.mdc`**.

---

## 7. Triad monitoring, governance & SOE

**Telemetry:** `triad_run_start` / `triad_panelist_end` / `triad_run_end` (payload includes **`mode`**: **`stub`** \| **`fetcher`** \| **`tablebase`**); **`preset_tablebase_hit`** when a keyword tablebase row short-circuits **`runTriad`**; **`athena_soe_recalibration`** with `[ATHENA_SOE_ACTIVE]: Recalibrating Triad Weights...` under stress.

**Governance:** **45% / 35% / 20%** on fidelity / velocity / frugality; **`triadHealthScore`** on `triad_run_end`.

**SOE:** `soe.ts` — pure hints. **Not** C++/DSP.

**Post-verify (CI / ops):** **`pnpm verify:harsh`** and **`pnpm verify:web`** (**`harshcheck`**) end with a **stderr** JSON line **`event: "verify_post_summary"`** — **`mode`**, **`exitCode`**, **`durationMs`**, **`failedStep`**, **`soeHint`**, **`note`**. Auditable; not a hidden brain. Detail: **`FIRE.md` §E1** item 5.

**Talent (opt-in):** **`analyzeTalentMarket`** / **`logTalentMarketAnalysis`** — compare triad health to **`talent/market-benchmarks.json`**; **`talent_market_analysis`** on stderr when logged. **No** auto model swap. **`FIRE.md` §J**, **§7c** below.

**Great Library / AGL (opt-in):** Offline batch → **`GreatLibraryContext`** (**`provenance` required**) → **`mergeGreatLibraryIntoSoeSnapshot`** → **`computeSoeRecommendations`**. **No** vector DB or scraper inside **`shared-engine`**; **no** amnesia / hidden intuition. **`FIRE.md` §K**, **§7d** below.

---

## 7b. Transparent arbitration (optional)

**Not** the triad panelists — a separate **opt-in** helper: **`runTransparentArbitration(candidates, { prompt?, runId? })`** in **`packages/shared-engine/arbitration/`**.

- **Three stages** vote **ALPHA** vs **OMEGA** (two **orderings** after **`scoreCandidates`**); **2-of-3** majority; votes are **deterministic** (hash), **not** random.
- **Telemetry:** **`arbitration_start`**, **`arbitration_stage_vote`**, **`arbitration_final`** via **`logEvent`** — auditable; no hidden kernel.
- **Default:** **not** imported by **`runTriad`** — wire only where product needs it.

**Doc:** **`packages/shared-engine/arbitration/README.md`**. **Tests:** **`tests/transparent-arbitration.test.ts`**. **Assessment contract:** **`FIRE.md` §I**.

---

## 7c. Talent market scout (optional)

**Not** shadow governance and **not** an automatic “replace weakest panelist” executor. **`packages/shared-engine/talent/`**:

| Piece | Role |
|--------|------|
| **`market-benchmarks.json`** | Operator-editable **`talents[]`** (`id`, `displayName`, **`comparativeScore`** [0,1], optional **`competesWithPanelist`**). **`meta.disclaimer`** — scores are planning aids, not live vendor truth. |
| **`market-scout.ts`** | **`analyzeTalentMarket`** — weakest **`panelistHealth`** or aggregate **`triadHealthScore`** vs top market row; default gap **≥ 0.15** → **`operatorReviewSuggested`**. **`logTalentMarketAnalysis`** → **`talent_market_analysis`**. |
| **Exports** | **`@alchemist/shared-engine`** — also **`getDefaultMarketBenchmarks`**, **`parseMarketBenchmarksDocument`**. |

**Deployer** changes API routes, env, and provider choice. **Forbidden:** runtime hot-swap of **`PANELIST_WEIGHTS`** or **`/api/triad/*`** from this module; omnipotent veto over gates; silent “memory purge” instead of logs.

**Doc:** **`packages/shared-engine/talent/README.md`**. **Tests:** **`tests/talent-market-scout.test.ts`**. **Assessment contract:** **`FIRE.md` §J**.

---

## 7d. Great Library / AGL (optional)

**Alchemist Great Library** is a **boundary** for **async** research (cron, worker, ETL), **not** a “shady” in-triad learner.

| Piece | Role |
|--------|------|
| **`learning/great-library.ts`** | **`mergeGreatLibraryIntoSoeSnapshot`**, **`logGreatLibraryMerge`** → **`great_library_soe_merge`**. |
| **`learning/offline-pipeline-types.ts`** | Types for a **future external** vector index — **not** implemented here (keeps **`web-app`** lean). |
| **`tools/preset-metadata-schema.example.json`** | Example **metadata-only** JSON for offline jobs — **not** runtime-loaded by the engine. |

**Rules:** **≤8s** triad path unchanged. **HARD GATE** still governs real **`.fxp`** / **`SerumState`** bytes. **Mandatory provenance** on every merge; **forbidden:** omnipotent panelist weight changes, silent history wipe, Slavic bypass “from the library.”

**Doc:** **`packages/shared-engine/learning/README.md`**. **Tests:** **`tests/learning-great-library.test.ts`**. **Assessment contract:** **`FIRE.md` §K**.

---

## 8. Web app (Next.js)

**Dev:** **`pnpm dev`** = **`pnpm dev:web`** — root scripts call **`node scripts/with-pnpm.mjs --filter @alchemist/web-app dev`**, which runs **`apps/web-app/scripts/dev-server.mjs`** (**no Turbo** wrapper for default web). If **`pnpm`** is not on PATH, **`with-pnpm.mjs`** uses **`npx --yes pnpm@9.14.2`** (or enable Corepack — **`FIRE.md`** snapshot). Optional Turbo: **`pnpm dev:turbo`**. **`dev-server.mjs`** resolves **Next** from **`apps/web-app`** or **repo root** (`node_modules`). **`HOST=0.0.0.0`** default (bind all interfaces — banner lists **`http://127.0.0.1:PORT`** and **`http://localhost:PORT`**); port scan **3000–3060**. Loopback-only: **`HOST=127.0.0.1`**. **`pnpm web:dev:fresh`** = **`clean`** + dev-server. **Watchers:** webpack **polling** + **`WATCHPACK_POLLING=true`** — **`RUN.txt`**, **`FIRE.md` §L**. **`next.config.mjs`:** **`experimental.optimizePackageImports`** for **`@react-three/fiber`** / **`@react-three/drei`**. **Mercury orb:** sphere segment count **128** (basic) / **256** (**ultra**) — **`MercuryBall.tsx`**.

**Client errors:** **`app/error.tsx`** — segment **error boundary**; **`app/global-error.tsx`** — root layout failures (includes **`html`/`body`**). Recovery hints: **`pnpm dev:recover`** (webpack/swc cache only), **`web:dev:fresh`**, **`pnpm run clean`**, **`pnpm dev`**, **127.0.0.1** URL from banner. **`FIRE.md` §L**.

**Build / harshcheck odd failures:** If **`next build`** or Turbo reports **`MODULE_NOT_FOUND`** inside **`.next`**, run **`pnpm run clean`** at root (or **`pnpm web:rebuild`**) then retry — **`RUN.txt`**, **`vst/README.md`**.

**From `vst/` only:** **`pnpm dev`**, **`pnpm dev:web`**, etc. run **`node ../scripts/with-pnpm.mjs …`** or **`node ../scripts/doctor.mjs`** — parent repo must exist. **`pnpm alc:doctor`** from **`vst/`** = **`cd .. && node scripts/doctor.mjs`**.

**One-liners (root):** **`pnpm go`**, **`pnpm go:fresh`**, **`./scripts/go.sh`**. From **`vst/`**: **`pnpm go`** / **`go:fresh`** forward to root (via **`with-pnpm.mjs`**).

**APIs:** `/api/health`, **`GET /api/health/wasm`** (JSON **`ok`**, **`status`**: **`available`** \| **`unavailable`**, **`message`** — aligns **Export .fxp** with real wasm-pack artifacts; **`force-dynamic`**), `/api/usage`, `/api/triad/*`. **Middleware:** `x-request-id` on `/api/*`.

**Env:** **`apps/web-app/env.ts`** — expand with Zod/t3-env for prod.

**Orb:** **`apps/web-app/docs/MERCURY-BALL.md`**.

---

## 9. Verification & scripts

| Command | What |
|---------|------|
| **`pnpm harshcheck`** (= **`verify:web`**) | `shared-types` build → typecheck (no mobile) → Vitest → **`next build`** via **`scripts/run-verify-with-summary.mjs`** (each step uses **`node scripts/with-pnpm.mjs …`**) |
| **`pnpm verify:harsh`** | Same without **`next build`** (mode **`verify-harsh`**; **`with-pnpm.mjs`** for steps) |
| **`node scripts/with-pnpm.mjs`** | Run any pnpm subcommand from repo root; **`npx pnpm@9.14.2`** fallback when **`pnpm`** missing (**`ALCHEMIST_PNPM_FALLBACK_QUIET=1`** during verify suppresses repeated warnings) |
| **`verify_post_summary`** | Final **stderr** JSON line: **`event`**, **`mode`** (`verify-harsh` \| `verify-web`), **`exitCode`**, **`durationMs`**, **`failedStep`** (`shared-types:build` \| `turbo:typecheck` \| `test:engine` \| `turbo:build:web-app` or **`null`**), **`monorepoRoot`**, **`soeHint`**, **`note`**. Vitest may emit other JSON lines first — parse/grep **`verify_post_summary`** for the rollup. |
| **`pnpm fire:sync`** | **`node scripts/sync-fire-md.mjs`** — runs **`pnpm test:engine`**; on success, rewrites **`docs/FIRE.md`** between **`ALCHEMIST:FIRE_METRICS`** comments (Vitest counts, Next version, sync date). Optional **`ALCHEMIST_FIRE_SYNC=1`** with **`pnpm harshcheck`** / **`verify:harsh`** to run automatically after green verify. |
| **`pnpm save`** / **`pnpm git:save`** | **`node scripts/git-save.mjs`** — stage all, commit (message from argv or prompt), **`git push`** when **`origin`** exists |
| **`pnpm github:first-push`** | **`node scripts/github-first-push.mjs`** — **`git remote add origin <url>`** + **`git push -u`** (first time); **`RUN.txt`**, **§2a** |
| **`pnpm test:engine`** | Vitest `shared-engine` only (incl. taxonomy, arbitration, **compliant-perf-boss**, **talent-market-scout**, **learning-great-library**, **reliability-tablebase**, undercover/slavic, triad governance, SOE, engine-harsh) |
| **`pnpm perf:boss`** | Runs perf-boss Vitest file — stderr **`perf_boss_*`** JSON timings (FIRE-compliant; not full monorepo) |
| **`pnpm test:gate`** | Offset gate hint |
| **`pnpm validate:offsets`** / **`pnpm assert:hard-gate`** | Run **`validate-offsets.py`** when **`tools/sample_init.fxp`** exists; **`assert:hard-gate`** logs explicit OK on success — **`ALCHEMIST_STRICT_OFFSETS=1`** if sample must be present |
| **`pnpm alc:doctor`** | Node ≥20, root, Next resolve (**never `pnpm doctor`**) |
| **`pnpm dev:turbo`** | Same web app via **`turbo run dev`** (only if you want Turbo-wrapped logs) |
| **`pnpm dev:web`** | Same as **`pnpm dev`** — direct web-app **`dev-server.mjs`** |
| **`pnpm dev:recover`** | **`node scripts/recover-web-dev.mjs`** + web **`dev-server.mjs`** — clears **`apps/web-app/.next/cache/{webpack,swc}`** |
| **`pnpm web:dev:fresh`** | **`pnpm run clean`** + web **`dev-server.mjs`** |
| **`pnpm run clean`** | Deletes **`apps/web-app/.next`**, **`apps/mobile-app/.expo`**, **`.turbo`**; stops turbo daemon — use before rebuild if **`.next`** is corrupt |
| **`pnpm web:rebuild`** | **`clean`** + forced **`turbo run build`** for web-app |
| **`pnpm go` / `go:fresh`** | Install + dev / fresh (root; **`vst/`** forwards) |
| **`pnpm typecheck`** | Turbo typecheck |
| **`pnpm check:transparent`** | Denylist scan: **`packages/shared-engine/**/*.ts`** — no shadow / KGB / amnesia-style **shipped** tokens (**`scripts/check-no-shadow-patterns.mjs`**) — optional CI / pre-commit; see **`FIRE.md` §I**, **`docs/AGENT-PLAYBOOK.md`** |
| **`.fxp` in browser** | Needs **`pnpm run build:wasm`** in **`packages/fxp-encoder`** (Rust). **`pnpm harshcheck`** can pass without Rust (encoder may stub). See **§10**, **`FIRE.md` §C / §E1.17** |

**Doc-synced project health:** Run **`pnpm fire:sync`** after a green **`pnpm harshcheck`** to stamp Vitest + Next versions into **`docs/FIRE.md`** (machine block). Narrative posture stays in **Assessment snapshot** above; **`fxp-encoder`** may skip without Rust — **`§10`**, **`FIRE.md` §C / §E1.17**.

**Typo note:** **`harshcheck`** — not `harshchek`.

**Skill:** **`.cursor/skills/harshcheck/SKILL.md`**.

---

## 10. WASM encoder & browser export

**Client:** Home page calls **`encodeFxp`** (`@alchemist/shared-engine` → dynamic import **`@alchemist/fxp-encoder/wasm`**). **`PromptAudioDock`** enables **Export .fxp** only when **`GET /api/health/wasm`** returns **`ok: true`** and **`status: "available"`**.

**Server health:** **`apps/web-app/app/api/health/wasm/route.ts`** inspects **`packages/fxp-encoder/pkg/`**: requires **`fxp_encoder_bg.wasm`** and a **non-stub** **`fxp_encoder.js`** (stub text contains **`WASM not built`**). Resolves **`pkg`** from **`process.cwd()`** (repo root, **`apps/web-app`**, or **`vst/`** — open the real monorepo so paths match). **`export const dynamic = "force-dynamic"`** so health is not baked at **`next build`**.

**Turbo / `pnpm build` (no Rust):** **`packages/fxp-encoder`** runs **`scripts/skip-if-no-rust.cjs`** — writes stub **`fxp_encoder.js`**, **`pkg/.skip`**, and removes stale **`fxp_encoder_bg.wasm`** (avoids “old WASM + stub JS” mismatch).

**Real WASM:** Install Rust (**https://rustup.rs**), **`rustup target add wasm32-unknown-unknown`**, then from **`packages/fxp-encoder`**: **`pnpm run build:wasm`** (wasm-pack → **`pkg/`**; **`scripts/clear-stub-marker.cjs`** removes **`pkg/.skip`** on success).

**HARD GATE** (authoritative bytes): still **`serum-offset-map.ts`** + **`validate-offsets.py`** — **`packages/fxp-encoder/README.md`**, **`FIRE.md` §D**.

---

## 11. Mobile & `vst/`

**Expo:** `pnpm dev:mobile` / `pnpm dev:all`. **`vst/`:** if Cursor opened only this folder, **`pnpm dev`** / **`pnpm harshcheck`** run **`node ../scripts/with-pnpm.mjs …`** from the parent repo — **no** global **`pnpm`** required. **`pnpm alc:doctor`** → **`node ../scripts/doctor.mjs`**. Prefer opening **Vibe Projects** (repo root). Checklist: **`vst/README.md`**.

---

## 12. Documentation index

### Under `docs/` (canonical specs)

| File | Role |
|------|------|
| **FIRESTARTER.md** | This file — **comprehensive** orientation + **Doc logic** (vs FIRE) |
| **FIRE.md** | **Outside assessment** + optimisation surface + harshcheck + **`verify_post_summary`** + §E–§G + **§H–§L** |
| **README.md** | Index → doc split + FIRESTARTER + FIRE |
| **AGENT-PLAYBOOK.md** | Optional **FIRE-aligned** multi-step flow (arbitration, Talent, AGL, verify) — **not** canonical law vs FIRE |

### Elsewhere

| Path | Role |
|------|------|
| **`apps/web-app/docs/MERCURY-BALL.md`** | Orb / WebGL |
| **`LEGAL.md`**, **`LICENSE`**, **`SECURITY.md`** (repo root) | Legal notices, proprietary license (default), vulnerability reporting |
| **Root `README.md`**, **`AGENTS.md`**, **`RUN.txt`** | Quick start, agents, one-liner |
| **`.cursorrules`** | Cursor root context |
| **`.cursor/rules/*.mdc`** (incl. **`alchemist-quality.mdc`** — edit checklist), **`.cursor/skills/harshcheck/SKILL.md`** | Rules + harshcheck |

**List markdown:** **`pnpm docs:list`**.

---

## 13. Roadmap / not assumed shipped

**Not** implied unless coded + tested: Redis token CB, semantic embedding cache, Claude-judge panelist, NestJS, `outside-check.sh`, adaptive provider routing.

**Out of triad contract (until specified + shipped):** **Mass “taxonomy” / tens-of-thousands of improvements** per request. The canonical path is **≤8 candidates**, **`AI_TIMEOUT_MS` = 8000** per panelist, and **TS gates** sized for a **small pool**. Any future large batch work belongs in an **explicit async / offline** design (separate timeout budget, batching, optional embedding cache or judge panelist — see bullets above) — **not** as a drop-in inside real-time **`runTriad`**.

**Shipped bridge:** **`packages/shared-engine/taxonomy/`** — **`engine.ts`**, **`sparse-rank.ts`**

- **`rankTaxonomy(prompt, fullTaxonomy)`** — keyword sparse (**`reasoning`**, cap **`TAXONOMY_PRE_SLAVIC_POOL_MAX` = 200**) then **`narrowTaxonomyPoolToTriadCandidates`**; use for **large** taxonomies (e.g. **~45k**). **Do not** mis-state the engine cap as **100** — canonical value is **200** (**`taxonomy/engine.ts`**, **`FIRE.md` §H**).
- **`narrowTaxonomyPoolToTriadCandidates(preSlavicPool, options?)`** — **sync**; await I/O **offline**, then call. **`options.prompt`** forwarded from **`rankTaxonomy`** (still **reserved** inside scoring).
- **&gt; 200** rows into **`narrowTaxonomyPoolToTriadCandidates`** → **`TaxonomyPoolTooLargeError`**. For **~45k** rows use **`rankTaxonomy(prompt, fullTaxonomy)`** — do **not** `slice(0, 200)` alone without **`scoreCandidates`**.
- Pipeline: **`scoreCandidates`** → **≤ `MAX_CANDIDATES`** (not **`slavicFilterDedupe` only**; no fake **`metadata`** on **`AICandidate`**).
- **Anti-patterns table:** **`packages/shared-engine/taxonomy/README.md`**. **Assessment:** **`FIRE.md` §H** + snapshot bullet.
- No **`TaxonomyState`** in **`shared-types`** until persistence/index contracts are defined.

**Shipped optional — arbitration:** **`packages/shared-engine/arbitration/`** — **`runTransparentArbitration`**; **`FIRE.md` §I**; **§7b** above.

**Shipped optional — talent market scout:** **`packages/shared-engine/talent/`** — **`analyzeTalentMarket`**, **`market-benchmarks.json`**; **`FIRE.md` §J**; **§7c** above.

**Shipped optional — Great Library (AGL):** **`packages/shared-engine/learning/`** — **`mergeGreatLibraryIntoSoeSnapshot`**, types for external indexers; **`FIRE.md` §K**; **§7d** above. Vector DB / scraping = **separate service** or **`tools/`** job.

Update **`FIRE.md`** snapshot + this file together when shipping behavior changes — see **Doc logic** (top of this file): **every material move** touches **both** docs.

---

## 14. Legal, license & security (canonical summary)

**This section is not legal advice.** For distribution, compliance, or commercial use, consult qualified counsel. **Authoritative detail** lives in **`LEGAL.md`** (root); **`FIRE.md` §G** ties this into audits.

| Topic | Contract |
|--------|-----------|
| **License** | Root **`LICENSE`** — default **all rights reserved**; **`package.json`** → **`UNLICENSED`** while private. Replace both if you adopt an open license (e.g. MIT). |
| **Trademarks** | **Serum** and related marks belong to their owners (e.g. **Xfer Records, Inc.**). This project is **not** affiliated or endorsed. References are for **interoperability** (`.fxp`, presets), not a grant of third-party IP. |
| **AI providers** | Triad may call external **LLM/API** services. Deployer is responsible for **ToS**, **keys**, **billing**, **data sent**, **retention**, and **subprocessors**. This repo does not license third-party models. |
| **Presets / exports** | Candidates and **`.fxp`** (etc.) are **at your own risk** — DAW/plugin compatibility, rights in prompts and derivatives, audio safety. **HARD GATE** is an **engineering** requirement for accurate bytes — **not** a legal warranty. |
| **Telemetry** | **`logEvent`** — triad (**§7**), optional **`arbitration_*`** (**§7b**), optional **`talent_market_analysis`** (**§7c**), optional **`great_library_soe_merge`** (**§7d**), post-verify **`verify_post_summary`** on stderr (**§9**), **`FIRE.md`** snapshot. If you ship to **end users**, align collection, retention, and notices with **GDPR / UK GDPR / CCPA** (etc.) and your **privacy policy**. |
| **Dependencies** | Run **`pnpm licenses list`** for third-party license text; you owe **NOTICE** / attribution if you redistribute bundles. |
| **User content** | User is responsible for **lawful** prompts and files — no infringement, no illegal content, no breach of third-party ToS on the deployer’s behalf. |
| **Warranty** | Software is **“as is”**; liability limited **to the extent permitted by law** — see **`LICENSE`** and **`LEGAL.md`**. |
| **Security** | Report vulnerabilities per **`SECURITY.md`** — **not** public issues for **active** exploits. |
| **Consumer launch** | Draft **`PRIVACY.md`** (template) at repo root — customize before public beta; **cookie policy** / **ToS** still required for a full launch. Web **`LegalDisclaimer`** footer: trademark hygiene (**Xfer / Serum**), AI/privacy pointer, **third-party preset / research metadata** responsibility (**`FIRE.md` §L** / **§G**). |

**From `vst/` workspace:** same files at **`../LEGAL.md`**, **`../SECURITY.md`**, **`../LICENSE`**.

---

## Appendix A — default workflow

1. Open **Vibe Projects** (has `apps/`, `packages/`). If you only have **`vst/`**, run **`pnpm dev`** / **`pnpm install`** there — scripts forward to the parent repo via **`with-pnpm.mjs`**.  
2. **`pnpm alc:doctor`** (or **`node scripts/doctor.mjs`** from root) → **`pnpm install`** / **`node scripts/with-pnpm.mjs install`** at **root** if needed.  
3. **`pnpm dev`** or **`pnpm dev:web`** — use a **cyan banner** URL (**`127.0.0.1`** or **`localhost`**, port may not be 3000; default bind **`0.0.0.0`**).  
4. Stale Next/types or weird **`MODULE_NOT_FOUND`** in **`.next`**: **`pnpm run clean`**, then **`pnpm web:dev:fresh`** or **`pnpm harshcheck`**.  
5. Verify: **`pnpm verify:harsh`** (fast) or **`pnpm harshcheck`** (includes **`next build`**). Capture **`verify_post_summary`** from stderr if you track SOE / CI rollups. After green: **`pnpm fire:sync`** to refresh **`docs/FIRE.md`** Vitest/Next metrics (or set **`ALCHEMIST_FIRE_SYNC=1`** on verify once).  
6. Optional: **`pnpm perf:boss`** — engine perf JSON on stderr (**`perf_boss_*`**).  
7. Optional: **`pnpm check:transparent`** — quick **`shared-engine`** denylist for forbidden shadow-pattern code (**`FIRE.md` §I**).  
8. Optional: wire **`analyzeTalentMarket`** + **`logTalentMarketAnalysis`** if you maintain **`market-benchmarks.json`** (**§7c**, **`FIRE.md` §J**).  
9. Optional: offline AGL jobs → **`mergeGreatLibraryIntoSoeSnapshot`** + **`computeSoeRecommendations`** (**§7d**, **`FIRE.md` §K**) — respect preset **licenses**; footer **`LegalDisclaimer`** notes third-party data responsibility.  
10. Multi-step agent flow (paste hints): **`docs/AGENT-PLAYBOOK.md`** — same contracts as **§7b–§7d** + verify; **not** a replacement for reading **`FIRE.md`**.  
11. **After a material code/product change:** update **`docs/FIRESTARTER.md`** (full detail); update **`docs/FIRE.md`** **§E–§L** only if contracts moved; run **`pnpm fire:sync`** for the machine metrics block — **Doc logic** at top of this file.

---

## Appendix B — INIT prompt (new Cursor / Composer session)

Paste into a **new** chat. Permanent rules already in **`.cursorrules`** + **`.cursor/rules/*.mdc`**.

```markdown
# [INIT]: PROJECT ALCHEMIST — TS PRODUCT LAYER
# [ROLE]: TypeScript / Next.js triad & preset pipeline only.
# [MANDATE]: No C++/JUCE/AU/VST “transmutation” in this repo unless a separate native project exists.

- **Product:** NL → Serum **preset candidates** → rank → optional **`.fxp`** (WASM).
- **Undercover / Slavic:** **TS gates** (`validate.ts`, `score.ts`) — not analog circuits. **`runTriad`** ≠ **`scoreCandidates`** (see **FIRESTARTER §5b**). Optional **keyword tablebase** (`reliability/`, empty by default) short-circuits **`runTriad`** — **no** gate bypass; telemetry **`preset_tablebase_hit`** / **`mode: "tablebase"`**.
- **Greek codenames:** ATHENA=DEEPSEEK 0.40, HERMES=LLAMA 0.35, HESTIA=QWEN 0.25 — telemetry + UI; velocity = **triad wall time**, not DAW buffer ms.
- **Governance:** 45/35/20 on telemetry — `triad-panel-governance.ts`.
- **Recovery:** monorepo root **or** `vst/` → `pnpm alc:doctor` (**NOT** `pnpm doctor`) → `pnpm install` (or **`node scripts/with-pnpm.mjs install`**) at root if Next won’t resolve → `pnpm dev` (= **`dev:web`**) → stale **`.next`**: `pnpm run clean` then `pnpm web:dev:fresh` or `pnpm harshcheck` → optional **`pnpm dev:turbo`**. **`with-pnpm.mjs`** if **`pnpm`** is not on PATH. **Git:** open folder with **`apps/`** + **`packages/`**; **`FIRESTARTER` §2a** if **`git status`** lists your whole home folder.
- **Truth:** `docs/FIRESTARTER.md` (**comprehensive**) + `docs/FIRE.md` (**outside assessment / LLM optimisation surface** — update **both** after material moves; **Doc logic** at top of FIRESTARTER). Optional: `docs/AGENT-PLAYBOOK.md`; **`pnpm check:transparent`**.
- **Legal / security / privacy:** `LEGAL.md`, **`PRIVACY.md`** (template), `LICENSE`, `SECURITY.md` (root); FIRESTARTER **§14**, FIRE **§G** — not legal advice.
- **Taxonomy:** large list → **`rankTaxonomy`**; or **≤200** `AICandidate` → **`narrowTaxonomyPoolToTriadCandidates`**; FIRE **§H**, **§6** / **§13** — **`reasoning`** ≥ **20** chars (**`isValidCandidate`**); optional **`description`** on **`AICandidate`** (**`shared-types`**); no opaque **`metadata`** without schema + doc update.
- **Arbitration (opt-in):** **`runTransparentArbitration`** — logged, deterministic, uses **`scoreCandidates`**; FIRE **§I**, **§7b**; not default in **`runTriad`**.
- **Perf:** **`pnpm perf:boss`** / **`runCompliantPerfBoss`** — **`perf_boss_*`** JSON; not shadow KGB; full monorepo cost still **`pnpm harshcheck`**.
- **Verify rollup:** stderr **`verify_post_summary`** after **`pnpm verify:harsh`** / **`harshcheck`** — auditable; grep last line or parse JSON. **`pnpm fire:sync`** (or **`ALCHEMIST_FIRE_SYNC=1`**) refreshes **`docs/FIRE.md`** machine metrics after green verify.
- **Talent (opt-in):** **`analyzeTalentMarket`** + **`talent/market-benchmarks.json`** — operator hints only; **no** auto API swap; FIRE **§J**, FIRESTARTER **§7c**.
- **AGL (opt-in):** **`mergeGreatLibraryIntoSoeSnapshot`** — **offline** + **`provenance`**; then **`computeSoeRecommendations`**; **no** scraper/vector client in engine; FIRE **§K**, **§7d**.
- **Web shell:** **`app/error.tsx`** + **`global-error.tsx`**; **`next.config.mjs`** dev polling; **`WATCHPACK_POLLING`** in **`dev-server.mjs`**; **`pnpm dev`** direct, **`dev:turbo`** optional; **`turbo.json`** **`envMode: loose`**; bad **`.next`**: **`pnpm run clean`** / **`web:rebuild`**; FIRE **§L**, FIRESTARTER **§8**.
- **WASM / Export .fxp:** **`GET /api/health/wasm`** + **`packages/fxp-encoder`** **`build:wasm`** (Rust); stub skip removes stale **`.wasm`**; FIRE **§C**, **§E1.17**, FIRESTARTER **§10**.
```

---

*Aligned with `.cursor/rules/alchemist-brief.mdc`.*
