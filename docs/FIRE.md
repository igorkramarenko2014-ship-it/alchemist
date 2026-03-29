# FIRE — outside assessment (lightweight)

**What this file is:** A **structured** surface for **auditors, CI, and external LLMs** — verify playbook (**§E**), contract tables (**§F–§M**), and **auditable** hooks (**`verify_post_summary`**, SOE). It is **not** the full project archive.

**Recovery bible:** If documentation is thin or scattered, treat **`docs/FIRESTARTER.md`** as the **canonical reconstruction guide** — monorepo layout, triad + gates (**§5b**), scripts, WASM, legal (**§14**), workflow appendices, INIT paste. **FIRE** does not duplicate that depth.

**Self-optimising metrics:** Under **Assessment snapshot**, the machine table between HTML comments **`ALCHEMIST:FIRE_METRICS`** (**BEGIN** / **END**) is refreshed by **`pnpm fire:sync`** (runs **`shared-engine` Vitest** + reads **`apps/web-app`** Next version). After a green verify, run **`fire:sync`**. Optional: **`ALCHEMIST_FIRE_SYNC=1`** with **`pnpm harshcheck`** or **`pnpm verify:harsh`** to refresh automatically on success.

**Explicit hooks (no shadow state):** **`verify_post_summary`** + **`soeHint`** on stderr after verify; **`soe.ts`** / governance telemetry — **forbidden:** unauditable loops (**§I**, **`pnpm check:transparent`**).

**Index:** Canonical **`docs/`** laws: **`FIRE.md`** (hub) + **`FIRE-core.md`** / **`FIRE-runtime.md`** / **`FIRE-ops.md`** / **`FIRE-extensions.md`** (split contracts) + **`FIRESTARTER.md`**. **Supplementary:** **`brain.md`** (detailed project brain + **doc map** table), **`iom.md`** (IOM — §9c + §9d discipline + growth protocol), **`reality-loop-layer.md`** (RLL — ground-truth telemetry contracts + SOE hint boundary; **no** shadow gate mutation), **`fire-v2-roadmap.md`** (public-pattern mapping + phased FIRE v2 execution plan), **`iom-architecture.md`** (**`pnpm igor:docs`** — power-cell digest), **`critical-fix-keynote-automation.md`** (presentation automation incident + runbook), **`MINIMUM-OPERATING-NUMBER.md`** (single readiness scalar contract), **`docs/internal/inner-circle-agent.md`** (peer prompt + Canon FIREWALL — tone only), **`cursor-universal-habits.md`** (User Rules template), **`vst-wrapper.md`** (optional JUCE VST3 read-only `.fxp` consumer + CLI/daemon pointers). **`docs/archive/alchemist-*.html`** — Composer prompt packs (**`FIRESTARTER` §12**). **Web app recovery ladder:** **§L** *Web app not running*. Optional multi-step agent flow: **`FIRESTARTER` Appendix C**. Root **`README.md`**, **`AGENTS.md`**, **`.cursorrules`**. **Legal:** **`LEGAL.md`**, **`PRIVACY.md`**, **`LICENSE`**, **`SECURITY.md`**.

**Maintenance:** **Narrative / implementation truth** → **`FIRESTARTER.md`**. **Contract changes** (gates, legal hooks, taxonomy rules) → edit **§E–§N** here. **Vitest counts & Next version** → **`pnpm fire:sync`** (do not hand-edit inside **`ALCHEMIST:FIRE_METRICS`**). **Markdown** under **`docs/`**: **`FIRE.md`** + **`FIRESTARTER.md`** + optional **`brain.md`**; **HTML** packs → **`docs/archive/`**, **§12**, **Appendix C–D**.

**Contents:** **Assessment snapshot** (metrics, **next moves**, verify loop) in this file; long-form **§A–N** contracts are split across **`FIRE-core.md`**, **`FIRE-runtime.md`**, **`FIRE-ops.md`**, **`FIRE-extensions.md`** (see **Contract law** below).

---

## Assessment snapshot

**Posture (summarise when product shifts; full honesty table → `FIRESTARTER` §5a):** **`POST /api/presets/share`** stores a **user-triggered** snapshot (in-memory in the Node server process) and returns a slug for **`/presets/[slug]`** — **no** `.fxp` bytes on the **`SharedPreset`** payload; gates mirror share UX (**score** ≥ **0.85**, **reasoning** length ≥ **15**, non-empty **`paramArray`**). **`POST /api/triad/deepseek`** / **`qwen`** / **`llama`** are **fetcher (live, key required)** when **`DEEPSEEK_API_KEY`**, **`QWEN_API_KEY`** (default DashScope-compatible **`qwen-plus`**; optional **`QWEN_BASE_URL`** for OpenRouter **`qwen/qwen-plus`** — **`env.ts`** / Qwen route), or **`GROQ_API_KEY`** / **`LLAMA_API_KEY`** (Groq Llama) are set — **`export const runtime = 'nodejs'`**, **`logEvent`** **`triad_run_start`** / **`triad_panelist_end`** on stderr (**`mode: fetcher`**, **`alchemistCodename`**, **`AI_TIMEOUT_MS`** **`AbortController`**), headers **`x-alchemist-triad-mode: fetcher`**; on provider/timeout failure routes return **`{ candidates: [] }`** with the same headers. Without keys: **stub** + **`mode: stub`** telemetry. **`GET /api/health`** exposes **`triad.livePanelists`** / **`triadFullyLive`**, **`igorOrchestrator`** (manifest), and **`iomPulse`** — **`getIOMHealthPulse()`** merges manifest digest + live triad/WASM flags + explicit **`schisms[]`** (heuristic “schism detector”; optional trimmed SOE when callers pass **`soeSnapshot`** from log aggregates). **Diagnostic only** — no shadow gate mutation. Client **`runTriad`** + **`scoreCandidates`** apply **real** TS gates (Undercover, **`reasoning`** ≥ **15** chars, Slavic **param** + **Dice**). Optional **keyword tablebase** can short-circuit **`runTriad`**. **HARD GATE:** no authoritative **`.fxp`** without validated **`serum-offset-map.ts`** + **`validate-offsets.py`**. **Formulas / modules → `FIRESTARTER` §5b.**

<!-- ALCHEMIST:FIRE_METRICS:BEGIN -->

_Machine block — do not edit by hand; run `pnpm fire:sync`._

| Signal | Value |
|--------|-------|
| **Synced (UTC)** | **2026-03-29** |
| **Vitest** (`@alchemist/shared-engine`) | **353** tests passed, **70** files (runner) · **70** `*.test.ts` on disk |
| **Next.js** (`apps/web-app`) | **14.2.35** (`dependencies.next`) |
| **Canonical metrics JSON** | `docs/fire-metrics.json` — verify: `sha256sum -c docs/fire-metrics.sha256` (repo root) |

**Commands:** `pnpm fire:sync` · optional `ALCHEMIST_FIRE_SYNC=1` on `pnpm harshcheck` / `pnpm verify:harsh` to refresh after a green run.

<!-- ALCHEMIST:FIRE_METRICS:END -->

### Minimum Operating Number (MON)

`MON` is the single operating-readiness number emitted by `verify_post_summary`.

| Field | Meaning |
|------|---------|
| `minimumOperatingNumber` | Same as `aiomIntegrityScore` in `[0,1]` |
| `minimumOperatingNumber117` | `round(MON * 117)` for compact operator display |
| `minimumOperatingReady` | `true` when `MON >= 0.9` |
| `minimumOperatingFormula` | `MON=aiomIntegrityScore; MON117=round(MON*117); ready when MON>=0.9` |
| Truth artifact | `artifacts/truth-matrix.json` stores **`metrics.mon.{value,ready,source}`** only; human strings like `117/117_READY` are derived for display, not stored as a second source of truth. |

Contract: MON is descriptive and auditable; it does not bypass HARD GATE, triad gates, or release checks.

### Compact truth matrix (stub/live/tablebase/export reality)

| Path | Stub mode | Fetcher mode | Tablebase hit | WASM export | HARD GATE | verify_post_summary carries |
|------|-----------|--------------|---------------|-------------|-----------|-----------------------------|
| Triad candidates | Yes | Yes | Short-circuit | N/A | N/A | `triadMode`, `triadLivePanelists` |
| TS gates (Undercover/Slavic) | Yes | Yes | Yes | N/A | N/A | `gateDropRate` |
| Preset share | Yes | Yes | Yes | No bytes | N/A | `preset_shared` telemetry |
| Browser `.fxp` export | Disabled when unavailable | Disabled when unavailable | Disabled | Requires real `assert:wasm` pass | Enforced for authoritative bytes | `wasmStatus`, `wasmRequired` |
| VST observe/wrapper | N/A | N/A | N/A | N/A | Enforced | `vstObserverStatus`, `vstWrapperStatus` |

### Next moves (operator / agent)

**Composer HTML packs** (task prompts + on-page **rejected** anti-patterns): **`docs/archive/alchemist-cursor-prompts.html`** (P0–P3), **`docs/archive/alchemist-high-efficiency-prompts.html`** (per-gate calibration breakdown; optional **`tablebaseMode: 'compete'`**), **`docs/archive/alchemist-cpc-execution-plan.html`** (timeouts / snapshot CI / **`gate:suggest`** / selection telemetry), **`docs/archive/alchemist-full-unblock-plan.html`** (M1–M5 pipeline), **`docs/archive/alchemist-new-moves.html`** (post-queue: circuit breaker, gate baseline regression CI, **`verify_post_summary`** capture), **`docs/archive/alchemist-tablebase-seeding.html`** (offline **`.fxp`** → tablebase, HARD GATE + provenance). **Roles → `FIRESTARTER` §12.** **FIRE v2 roadmap:** **`docs/fire-v2-roadmap.md`** — public-pattern mapping + phased execution plan (outside assessment shell, RLL, two-lane verify).

**Recently shipped:** **Preset share** — **`POST /api/presets/share`**, **`/presets/[slug]`**, **`logEvent`** **`preset_shared`**, IOM power cell **`preset_share`** + **`IOM_CELL_VITEST_MAP`** bridge (**`tests/preset-share-cell.test.ts`**); web tests **`apps/web-app/__tests__/preset-share.test.ts`**. **`pnpm igor:heal`** → gitignored **`tools/iom-proposals.jsonl`** + stderr audit; **`pnpm igor:apply`** — interactive **y/n** append to **`igor-power-cells.json`** only on confirm, then **`pnpm igor:sync`**. **`verify_post_summary`** may include **`iomCoverageScore`** + **`iomSelectiveWarnings`** on local selective **`harshcheck`**. **`iom-pulse.ts`** — **`getIOMHealthPulse`**, **`detectSchisms`**; **`GET /api/health` → `iomPulse`**. **`QWEN_BASE_URL`** wiring; **`pnpm test:real-gates`** + **`logEvent`** **`calibration_*`** (artifact **`tools/gate-calibration-output.json`** — **gitignored**); **`useTriadHealth`** + dock triad status; root **`env:check`**, **`verify:keys`**, **`check:ready`**, **`build:wasm`** — **`FIRESTARTER` §9.**

**Explicit queue (no runtime threshold auto-apply; no shadow governance in `runTriad`):** partial triad **UI banner** when **`triadFullyLive === false`**; **`PANELIST_TIMEOUT_MS`** only after measured latency (**`pnpm test:real-gates`**) + **§B / §E1** doc update; **`gate:suggest`** stdout-only diagnostic; optional tablebase **compete** mode; snapshot gate CI; **`triad_candidate_selected`** **`logEvent`**; optional **`REQUIRE_WASM=1`** **`assert:wasm`** — exact file touches in the HTML packs.

### Verify loop (human checklist)

- **`pnpm harshcheck`** (= **`verify:web`**) → `shared-types` build → typecheck (no mobile) → **`shared-engine` Vitest** (local **selective** path may run fewer files when **`ALCHEMIST_SELECTIVE_VERIFY=1`** and diffs match **`igor-power-cells.json`** — see **`run-verify-with-summary.mjs`**) → **`next build`** via **`scripts/run-verify-with-summary.mjs`** — stderr **`verify_post_summary`** (**§E1**). Canonical name: **`harshcheck`**; root also ships **`pnpm harshchek`** as the same script (typo alias).
- **Fast iteration (localized `shared-engine` edits):** **`pnpm test:engine:grep -- --grep <pattern>`** runs Vitest with a filter — **`brain.md` §9c.1**; **`pnpm igor:heal`** → gitignored **`tools/iom-proposals.jsonl`** + stderr; **`pnpm igor:apply`** prompts before appending to **`igor-power-cells.json`**. Still run full **`verify:harsh`** / **`harshcheck`** before treating a change as shippable.
- **`pnpm verify:harsh`** — same without **`next build`**. Scripts use **`node scripts/with-pnpm.mjs`** (**`npx pnpm@9.14.2`** fallback if **`pnpm`** missing). **Engine School:** the same run ends with **`validate-learning-corpus.mjs`** over **`packages/shared-engine/learning/corpus/**/*.json`** (fail-closed, lesson schema **1.2**; optional one-shot **`learning-forget-presets`** if junk appears under **`corpus/`**). Debug: **`LEARNING_CORPUS_NO_AUTO_SANITIZE=1`** (fail without auto-delete), **`LEARNING_CORPUS_SKIP_FS_CLEAN_CHECK=1`** (emergency only). **Phase 2 (opt-in):** **`ALCHEMIST_LEARNING_CONTEXT=1`** requires a pre-built **`learning-index.json`** (**`pnpm learning:build-index`**) — advisory ≤800-char block on **`POST /api/triad/*`**; telemetry **`triad_run_start.learningContextUsed`**; stderr **`engine_school_influence`** (on in dev / Vercel preview by default, off in prod unless **`ALCHEMIST_LEARNING_TELEMETRY=1`**). Optional **`triadSessionId`** on triad JSON aligns panelists with **`triad_run_end`** / JSONL. **Phase 3 (opt-in):** **`ALCHEMIST_CORPUS_PRIOR=1`** — corpus-affinity re-rank after Slavic + intent blend (**gate math unchanged**); default nudge **0.08**; telemetry **`score_candidates`** (e.g. **`corpusAffinityApplied`**). **Phase 4 — Taste Corpus (opt-in):** **`ALCHEMIST_TASTE_PRIOR=1`** requires a pre-built **`taste-index.json`** (**`pnpm taste:build-index`**) — operator music taste (1403 tracks, **6** clusters, governance hierarchy **`1F7_FENOMAN` → `ALPAKA_FAV` → `Amsterdammer_`**) applies a **`computeTasteAffinity`** advisory nudge (default **0.06**) on **`scoreCandidates`** survivors after gates; global **`darkValenceBias`** penalty on bright/acoustic candidates; telemetry **`score_candidates`** (`tasteAffinityApplied`, `tasteClusterHit`, `tasteEffectiveWeight`). Rebuild: **`pnpm taste:rebuild`** — drop Exportify CSVs into **`learning/taste/raw/`** (gitignored), script re-clusters and rewrites **`taste-index.json`**. Validate: **`pnpm taste:validate`**. **`taste-index.json`** is gitignored; **`taste-schema.json`** is committed. **Index policy:** keep **`learning-index.json`** gitignored and generate at deploy **or** commit it and add a drift-check in CI — pick one and document in **`packages/shared-engine/learning/README.md`**. Offline **`pnpm learning:assess-fitness`** is **not** part of verify — static corpus metadata only; see **`packages/shared-engine/learning/README.md`**.
- **Ship vs verify:** green verify **≠** browser **`.fxp`** — encoder may be **stubbed** without Rust (**§E1.17**, **`FIRESTARTER` §10**). **`@alchemist/fxp-encoder`:** **`skip-if-no-rust.cjs`** when no Rust.
- **Web dev / recovery:** **`§L`** + **`FIRESTARTER` §8** — **`dev-server.mjs`**, **`pnpm save`**, **`vst/`** slice.
- **Git / GitHub:** **Repo root** must be the folder that contains **`apps/`** and **`packages/`** (open that folder in Cursor — not an empty Desktop stub). **`git remote -v`** → **`origin`** is the canonical host; **`pnpm save -- "msg"`** stages, commits, and **`git push`** when **`origin`** exists. First-time remote: **`pnpm github:first-push -- "https://github.com/ORG/REPO.git"`** — detail **`FIRESTARTER` §2a**.

**Legal / security (product truth):** **`FIRESTARTER.md` §14**; root **`LEGAL.md`**, **`LICENSE`**, **`SECURITY.md`**. External audits: **§G**.

### Self-optimization & quality

- **SOE:** `soe.ts` — `computeSoeRecommendations(SoeTriadSnapshot)` from **latency / triad failure rate / gate-drop rate** → hints only (**TS**, not DSP). **`verify_post_summary.soeHint`** (after verify) is another **explicit** hint line for ops — pipe stderr to your store if you feed **`computeSoeRecommendations`**.
- **Talent market scout (opt-in):** Full contract **§J**. Summary: **`talent/market-scout.ts`** + **`talent/market-benchmarks.json`** — **`analyzeTalentMarket`**, optional **`logTalentMarketAnalysis`** → **`talent_market_analysis`**. **No** auto model-swap, **no** shadow governance, **no** “amnesia” / silent purge — deployer updates routes and config.
- **Great Library / AGL (opt-in):** Full contract **§K**. **`learning/great-library.ts`** — **`mergeGreatLibraryIntoSoeSnapshot`** merges **offline**, **provenance-required** overlays into **`SoeTriadSnapshot`**; optional **`logGreatLibraryMerge`** → **`great_library_soe_merge`**. **No** in-request scraping, **no** vector DB in **`shared-engine`**, **no** hidden intuition or weight omnipotence — then **`computeSoeRecommendations`**. **`tools/preset-metadata-schema.example.json`** illustrates metadata-only batch JSON.
- **Governance:** `triad-panel-governance.ts` — default **45% / 35% / 20%** (fidelity / velocity / frugality) on telemetry; **`triad_run_end`**: `triadHealthScore`, `triadGovernanceScores`; **`athena_soe_recalibration`** + **`[ATHENA_SOE_ACTIVE]: Recalibrating Triad Weights...`** when velocity component &lt; **0.7**.
- **Telemetry:** `triad_run_*` JSON via `logEvent` (includes **`mode`**: **`stub`** \| **`fetcher`** \| **`tablebase`**); **`preset_tablebase_hit`** when the keyword tablebase short-circuits **`runTriad`**; **`preset_shared`** when a qualifying candidate is shared to **`/presets/[slug]`**; **`alchemistCodename`** (ATHENA / HERMES / HESTIA) on `triad_panelist_end`. **Engine School (opt-in):** **`triad_run_start.learningContextUsed`** (`injected`, **`selectedLessonIds`**, **`contextCharCount`**); optional **`triadSessionId`** with **`triad_run_end`** / structured JSONL; stderr **`engine_school_influence`**; **`score_candidates`** fields such as **`corpusAffinityApplied`** when Phase 3 is on — contract **`docs/Engine-School-Validation.md`** §8. **Taste Corpus (opt-in):** **`tasteAffinityApplied`**, **`tasteClusterHit`** (e.g. `dark_alt_rock`), **`tasteEffectiveWeight`** on **`score_candidates`** when **`ALCHEMIST_TASTE_PRIOR=1`** — contract **`docs/Engine-School-Validation.md`** §9. **Reality loop (optional):** **`logRealitySignal`** → **`alchemist_*`** events (**`docs/reality-loop-layer.md`**) — outcome/export signals; **hints only**; optional **`realityGroundTruth`** rollup on **`SoeTriadSnapshot`**. Stub fallback runs are **non-learning by default**, may be included only after explicit IOM/operator enablement, and should remain **Plan Z** usage (last-resort continuity only). Optional **`arbitration_*`** (**§I**). Optional **`talent_market_analysis`** (**§J**). Optional **`great_library_soe_merge`** (**§K**). Post-verify **`verify_post_summary`** on stderr (**§E1**).
- **Igor — two layers (assessment):** (1) **Digital Igor / Cursor skills (`brain.md` §9c):** **`.cursor/skills/`** (e.g. **`inner-circle-voice`**, **`harshcheck`**), **`docs/internal/inner-circle-agent.md`**, **`alchemist-inner-circle-default.mdc`**, **`alchemist-apex-orchestrator.mdc`** — operators **train** orchestration ethos here (truth → task → tone, peer voice, humor shape, verify habits). **`shared-engine` does not import** skill files. (2) **Igor orchestrator manifest (`brain.md` §9d):** **`igor-orchestrator-layer.ts`** + **`pnpm igor:sync`** — discovers **`@alchemist/*`**, merges **`igor-orchestrator-meta.json`** → **`igor-orchestrator-packages.gen.ts`**, reads **`igor-power-cells.json`** → **`igor-orchestrator-cells.gen.ts`**; **`pnpm verify:harsh`** / **`harshcheck`** run **`sync-igor-orchestrator.mjs --check`** (after **`brain:sync` --check**); **`GET /api/health` → `igorOrchestrator`**; optional **`logIgorOrchestratorManifest()`** → **`igor_orchestrator_manifest`**. **`iom-pulse.ts`** — **`getIOMHealthPulse`**, **`detectSchisms`** — merges manifest digest with triad/WASM (and optional **`SoeTriadSnapshot`** for numeric schisms + SOE summary); health JSON **`iomPulse`**; explicit **`schisms[]`**, **no** auto mutation. **Ops map + diagnostics only** — **no** gate/triad override — **`AGENTS.md` §8e**, **`brain.md` §9c–§9d**.
- **IOM (`docs/iom.md`):** Umbrella term for **both** layers + **canon firewall** + growth / commit conventions. Machine: **`IOM_CELL_MAX`** (default **32**) + **artifact files must exist** under **`packages/shared-engine/`** — enforced in **`sync-igor-orchestrator.mjs`**. Policy consolidation target: **`IOM_POLICY_CELL_MAX` = 12** (**`igor-orchestrator-layer.ts`**). **`pnpm igor:heal`** / **`pnpm igor:apply`** — ghost scan → JSONL → interactive cell append (**no** silent manifest mutation). Cursor: **`.cursor/rules/alchemist-iom.mdc`**.
- **Persona vs canon:** Peer tone / skills / **`docs/internal/inner-circle-agent.md`** **never** overrides Serum **HARD GATE**, TS gate facts, or triad wiring. Typical discipline: **`pnpm verify:harsh`** → **`pnpm harshcheck`** → **`pnpm fire:sync`** (refresh metrics); **green CI / verify alone** ≠ healthy **`.fxp`/WASM** path — **§E1**.

### Triad & gates

- **IDs:** `LLAMA` / `DEEPSEEK` / `QWEN`. **Weights:** **0.35 / 0.40 / 0.25** (Llama / DeepSeek / Qwen). **Routes:** `/api/triad/{llama,deepseek,qwen}`.
- **Non-goal (see FIRESTARTER §13):** Real-time **taxonomy / N≫8** improvement batches — not canonical; would need async design + roadmap infra. **Bridge (shipped):** **`narrowTaxonomyPoolToTriadCandidates`** (**≤200** rows → **`scoreCandidates`** → **≤8**); **`rankTaxonomy(prompt, fullTaxonomy)`** in **`taxonomy/sparse-rank.ts`** — keyword sparse on **`reasoning`** (O(n) on full list) then engine path. Length **&gt; `TAXONOMY_PRE_SLAVIC_POOL_MAX`** passed to the engine throws **`TaxonomyPoolTooLargeError`**. **`AICandidate`** may include optional **`description`** (**`shared-types`**) for UI / Slavic legibility text; no opaque **`metadata`** bag without schema change. **`taxonomy/README.md`**; tests **`taxonomy-engine`**, **`taxonomy-sparse-rank`** (**`pnpm test:engine`**).
- **Gates (TypeScript):** Undercover distribution (`validate.ts`); **legibility:** **`reasoning`** trimmed length ≥ **`REASONING_LEGIBILITY_MIN_CHARS` (15)** in **`isValidCandidate`**; contextual entropy + adversarial variance; Slavic (`score.ts`): cosine **>** **`SLAVIC_FILTER_COSINE_THRESHOLD` (0.80)** on **`paramArray`**, and when both candidates have legible **`description` || `reasoning`**, **Dice(bigram)** **>** **`SLAVIC_TEXT_DICE_THRESHOLD` (0.75)** — catches same-params-different-copy without NL **embedding** models (**`FIRESTARTER` §5b / §6**). **Not** VST DSP — **`.cursor/rules/alchemist-dsp-vs-ts-gates.mdc`**.
- **Optional arbitration (opt-in):** **`runTransparentArbitration`** — see **§I** + **`FIRESTARTER` §7b** + **`packages/shared-engine/arbitration/README.md`**.
- **Perf audit (opt-in):** **`runCompliantPerfBoss()`** / **`pnpm perf:boss`** — times **`shared-engine`** gates, taxonomy, arbitration, SOE/governance; **`logEvent`** `perf_boss_*` (auditable, **not** shadow). **`packages/shared-engine/perf/README.md`**.

### Dev & diagnostics

- **Root:** folder with **`apps/`** + **`packages/`**. **`research/`** — optional Python (see **`research/README.md`**); **not** part of **`harshcheck`**. **`vst/`** is a thin slice: same **`pnpm`** scripts **`cd ..`** to root (`dev`, **`dev:web`**, **`alc:doctor`**, **`web:dev:fresh`**, **`go`**, **`go:fresh`**, **`harshcheck`**, etc.). **`vst/README.md`** — troubleshooting.
- **New agent:** repo **`.cursorrules`** + **`docs/FIRESTARTER.md`** Appendix B (INIT paste). **No `pnpm doctor`** — use **`pnpm alc:doctor`** (or **`pnpm run alc:doctor`** if needed).
- **Dev:** **`pnpm dev`** (= **`pnpm dev:web`**, direct filter — **not** Turbo-wrapped for web; optional **`pnpm dev:turbo`**); **`apps/web-app/scripts/dev-server.mjs`** — default **`HOST=0.0.0.0`** (override **`HOST=127.0.0.1`** for loopback-only), port probe on **same host**, scan **3000–3120**, cyan banner — use **that** URL (not a fixed **3000**). **`pnpm dev:recover`** — clears **`apps/web-app/.next/cache/{webpack,swc}`** then dev (corrupt dev cache). **`pnpm web:dev:fresh`** = full clean + **same** dev-server. **`EMFILE` / Watchpack:** **`§L`**, **`RUN.txt`**. **Restart `pnpm dev`** after **`packages/shared-engine`** or **`app/api/triad/*`** changes so **`runTriad`** / route timeouts match disk (**HMR** may not reload the linked **`@alchemist/shared-engine`** bundle reliably).
- **Client resilience:** **`app/error.tsx`** — segment **error boundary**; **`app/global-error.tsx`** — root shell (**`html`/`body`**). Both log via **`console.error`**. **`§L`**.
- **Build hygiene:** **`apps/web-app`** **`pnpm run build`** runs **`pnpm run clean`** then **`next build`** with **`NODE_OPTIONS=--max-old-space-size=8192`** (reduces flaky **`PageNotFoundError`** / missing chunk **`MODULE_NOT_FOUND`** during “Collecting page data” under Turbo). **`harshcheck`** / Turbo must not reuse a half-written **`.next`**. If build still fails, **`pnpm run clean`** (root) clears **`.next`**, **`.turbo`**, stops turbo daemon — then retry. **`pnpm web:rebuild`** = clean + forced web **`next build`**.

---

## Contract law (split)

Long-form **§A–N** tables live in satellite files so this hub stays navigable. **Assessment snapshot** (above) + **`ALCHEMIST:FIRE_METRICS`** remain here; **recovery-grade** narrative stays **`FIRESTARTER.md`**.

| File | Scope |
|------|--------|
| **`docs/FIRE-core.md`** | **§D** HARD GATE · **§E** verify → assess → suggest · **§F** transmutation (TS layer) |
| **`docs/FIRE-runtime.md`** | **§A–C** dock / triad / export · **§L** web shell & dev |
| **`docs/FIRE-ops.md`** | **§M** CI/CD contracts |
| **`docs/FIRE-extensions.md`** | **§G–K, N** legal · taxonomy · arbitration · talent · Great Library · outside-assessment shell |

**Footer:** **`FIRESTARTER.md`** — rebuild-from-repo operations. **`FIRE.md`** + **`FIRE-*.md`** — assessment + **`pnpm fire:sync`** metrics.

---
