# FIRE — outside assessment (lightweight)

**What this file is:** A **structured** surface for **auditors, CI, and external LLMs** — verify playbook (**§E**), contract tables (**§F–§L**), and **auditable** hooks (**`verify_post_summary`**, SOE). It is **not** the full project archive.

**Recovery bible:** If documentation is thin or scattered, treat **`docs/FIRESTARTER.md`** as the **canonical reconstruction guide** — monorepo layout, triad + gates (**§5b**), scripts, WASM, legal (**§14**), workflow appendices, INIT paste. **FIRE** does not duplicate that depth.

**Self-optimising metrics:** Under **Assessment snapshot**, the machine table between HTML comments **`ALCHEMIST:FIRE_METRICS`** (**BEGIN** / **END**) is refreshed by **`pnpm fire:sync`** (runs **`shared-engine` Vitest** + reads **`apps/web-app`** Next version). After a green verify, run **`fire:sync`**. Optional: **`ALCHEMIST_FIRE_SYNC=1`** with **`pnpm harshcheck`** or **`pnpm verify:harsh`** to refresh automatically on success.

**Explicit hooks (no shadow state):** **`verify_post_summary`** + **`soeHint`** on stderr after verify; **`soe.ts`** / governance telemetry — **forbidden:** unauditable loops (**§I**, **`pnpm check:transparent`**).

**Index:** Canonical **`docs/`** laws: **`FIRE.md`** (this file) + **`FIRESTARTER.md`**. **Supplementary:** **`brain.md`** (detailed project brain), **`brain-plus.md`** (minimal outside-assessment shell; metrics synced with **`pnpm fire:sync`**). **`docs/alchemist-*.html`** — Composer prompt packs (**`FIRESTARTER` §12**). Optional multi-step agent flow: **`FIRESTARTER` Appendix C**. Root **`README.md`**, **`AGENTS.md`**, **`.cursorrules`**. **Legal:** **`LEGAL.md`**, **`PRIVACY.md`**, **`LICENSE`**, **`SECURITY.md`**.

**Maintenance:** **Narrative / implementation truth** → **`FIRESTARTER.md`**. **Contract changes** (gates, legal hooks, taxonomy rules) → edit **§E–§L** here. **Vitest counts & Next version** → **`pnpm fire:sync`** (do not hand-edit inside **`ALCHEMIST:FIRE_METRICS`** or **`ALCHEMIST:BRAIN_PLUS_METRICS`** markers). **Markdown** under **`docs/`**: **`FIRE.md`** + **`FIRESTARTER.md`** + optional **`brain.md`** / **`brain-plus.md`**; **HTML** packs + agent notes → **§12**, **Appendix C–D**.

**Contents:** **§A–C** invariants, **Assessment snapshot** (metrics, **next moves**, verify loop), **§E** VERIFY / RISKS / SUGGEST, **§F–§L** contracts.

---

## Assessment snapshot

**Posture (summarise when product shifts; full honesty table → `FIRESTARTER` §5a):** **`POST /api/triad/deepseek`** / **`qwen`** / **`llama`** are **fetcher (live, key required)** when **`DEEPSEEK_API_KEY`**, **`QWEN_API_KEY`** (default DashScope-compatible **`qwen-plus`**; optional **`QWEN_BASE_URL`** for OpenRouter **`qwen/qwen-plus`** — **`env.ts`** / Qwen route), or **`GROQ_API_KEY`** / **`LLAMA_API_KEY`** (Groq Llama) are set — **`export const runtime = 'nodejs'`**, **`logEvent`** **`triad_run_start`** / **`triad_panelist_end`** on stderr (**`mode: fetcher`**, **`alchemistCodename`**, **`AI_TIMEOUT_MS`** **`AbortController`**), headers **`x-alchemist-triad-mode: fetcher`**; on provider/timeout failure routes return **`{ candidates: [] }`** with the same headers. Without keys: **stub** + **`mode: stub`** telemetry. **`GET /api/health`** exposes **`triad.livePanelists`** / **`triadFullyLive`**. Client **`runTriad`** + **`scoreCandidates`** apply **real** TS gates (Undercover, **`reasoning`** ≥ **15** chars, Slavic **param** + **Dice**). Optional **keyword tablebase** can short-circuit **`runTriad`**. **HARD GATE:** no authoritative **`.fxp`** without validated **`serum-offset-map.ts`** + **`validate-offsets.py`**. **Formulas / modules → `FIRESTARTER` §5b.**

<!-- ALCHEMIST:FIRE_METRICS:BEGIN -->

_Machine block — do not edit by hand; run `pnpm fire:sync`._

| Signal | Value |
|--------|-------|
| **Synced (UTC)** | **2026-03-23** |
| **Vitest** (`@alchemist/shared-engine`) | **68** tests passed, **13** files (runner) · **13** `*.test.ts` on disk |
| **Next.js** (`apps/web-app`) | **14.2.35** (`dependencies.next`) |

**Commands:** `pnpm fire:sync` · optional `ALCHEMIST_FIRE_SYNC=1` on `pnpm harshcheck` / `pnpm verify:harsh` to refresh after a green run.

<!-- ALCHEMIST:FIRE_METRICS:END -->

### Next moves (operator / agent)

**Composer HTML packs** (task prompts + on-page **rejected** anti-patterns): **`docs/alchemist-cursor-prompts.html`** (P0–P3), **`docs/alchemist-high-efficiency-prompts.html`** (per-gate calibration breakdown; optional **`tablebaseMode: 'compete'`**), **`docs/alchemist-cpc-execution-plan.html`** (timeouts / snapshot CI / **`gate:suggest`** / selection telemetry), **`docs/alchemist-full-unblock-plan.html`** (M1–M5 pipeline), **`docs/alchemist-new-moves.html`** (post-queue: circuit breaker, gate baseline regression CI, **`verify_post_summary`** capture), **`docs/alchemist-tablebase-seeding.html`** (offline **`.fxp`** → tablebase, HARD GATE + provenance). **Roles → `FIRESTARTER` §12.**

**Recently shipped:** **`QWEN_BASE_URL`** wiring; **`pnpm test:real-gates`** + **`logEvent`** **`calibration_*`** (artifact **`tools/gate-calibration-output.json`** — **gitignored**); **`useTriadHealth`** + dock triad status; root **`env:check`**, **`verify:keys`**, **`check:ready`**, **`build:wasm`** — **`FIRESTARTER` §9.**

**Explicit queue (no runtime threshold auto-apply; no shadow governance in `runTriad`):** partial triad **UI banner** when **`triadFullyLive === false`**; **`PANELIST_TIMEOUT_MS`** only after measured latency (**`pnpm test:real-gates`**) + **§B / §E1** doc update; **`gate:suggest`** stdout-only diagnostic; optional tablebase **compete** mode; snapshot gate CI; **`triad_candidate_selected`** **`logEvent`**; optional **`REQUIRE_WASM=1`** **`assert:wasm`** — exact file touches in the HTML packs.

### Verify loop (human checklist)

- **`pnpm harshcheck`** (= **`verify:web`**) → `shared-types` build → typecheck (no mobile) → **`shared-engine` Vitest** → **`next build`** via **`scripts/run-verify-with-summary.mjs`** — stderr **`verify_post_summary`** (**§E1**). Canonical name: **`harshcheck`**; root also ships **`pnpm harshchek`** as the same script (typo alias).
- **`pnpm verify:harsh`** — same without **`next build`**. Scripts use **`node scripts/with-pnpm.mjs`** (**`npx pnpm@9.14.2`** fallback if **`pnpm`** missing).
- **Ship vs verify:** green verify **≠** browser **`.fxp`** — encoder may be **stubbed** without Rust (**§E1.17**, **`FIRESTARTER` §10**). **`@alchemist/fxp-encoder`:** **`skip-if-no-rust.cjs`** when no Rust.
- **Web dev / recovery:** **`§L`** + **`FIRESTARTER` §8** — **`dev-server.mjs`**, **`pnpm save`**, **`vst/`** slice.
- **Git / GitHub:** **Repo root** must be the folder that contains **`apps/`** and **`packages/`** (open that folder in Cursor — not an empty Desktop stub). **`git remote -v`** → **`origin`** is the canonical host; **`pnpm save -- "msg"`** stages, commits, and **`git push`** when **`origin`** exists. First-time remote: **`pnpm github:first-push -- "https://github.com/ORG/REPO.git"`** — detail **`FIRESTARTER` §2a**.

**Legal / security (product truth):** **`FIRESTARTER.md` §14**; root **`LEGAL.md`**, **`LICENSE`**, **`SECURITY.md`**. External audits: **§G**.

### Self-optimization & quality

- **SOE:** `soe.ts` — `computeSoeRecommendations(SoeTriadSnapshot)` from **latency / triad failure rate / gate-drop rate** → hints only (**TS**, not DSP). **`verify_post_summary.soeHint`** (after verify) is another **explicit** hint line for ops — pipe stderr to your store if you feed **`computeSoeRecommendations`**.
- **Talent market scout (opt-in):** Full contract **§J**. Summary: **`talent/market-scout.ts`** + **`talent/market-benchmarks.json`** — **`analyzeTalentMarket`**, optional **`logTalentMarketAnalysis`** → **`talent_market_analysis`**. **No** auto model-swap, **no** shadow governance, **no** “amnesia” / silent purge — deployer updates routes and config.
- **Great Library / AGL (opt-in):** Full contract **§K**. **`learning/great-library.ts`** — **`mergeGreatLibraryIntoSoeSnapshot`** merges **offline**, **provenance-required** overlays into **`SoeTriadSnapshot`**; optional **`logGreatLibraryMerge`** → **`great_library_soe_merge`**. **No** in-request scraping, **no** vector DB in **`shared-engine`**, **no** hidden intuition or weight omnipotence — then **`computeSoeRecommendations`**. **`tools/preset-metadata-schema.example.json`** illustrates metadata-only batch JSON.
- **Governance:** `triad-panel-governance.ts` — default **45% / 35% / 20%** (fidelity / velocity / frugality) on telemetry; **`triad_run_end`**: `triadHealthScore`, `triadGovernanceScores`; **`athena_soe_recalibration`** + **`[ATHENA_SOE_ACTIVE]: Recalibrating Triad Weights...`** when velocity component &lt; **0.7**.
- **Telemetry:** `triad_run_*` JSON via `logEvent` (includes **`mode`**: **`stub`** \| **`fetcher`** \| **`tablebase`**); **`preset_tablebase_hit`** when the keyword tablebase short-circuits **`runTriad`**; **`alchemistCodename`** (ATHENA / HERMES / HESTIA) on `triad_panelist_end`. Optional **`arbitration_*`** (**§I**). Optional **`talent_market_analysis`** (**§J**). Optional **`great_library_soe_merge`** (**§K**). Post-verify **`verify_post_summary`** on stderr (**§E1**).

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

## A. Dock & Mercury (invariants)

**`PromptAudioDock`:** **`hasPresets`** → results subtree; else **`EarModeController`**. Orb remount on switch. **`onListeningChange(false)`** when presets appear. Detail: **`apps/web-app/docs/MERCURY-BALL.md`**.

---

## B. Triad optimization (canonical)

**Weights:** DeepSeek **0.40**, Llama **0.35**, Qwen **0.25**. **8** candidates; **8s** / panelist (default client fetch; **QWEN** **18s** — **`TRIAD_PANELIST_CLIENT_TIMEOUT_MS`**). **`shared-types`** = payload truth. **Source:** `shared-engine` + `app/api/triad/*`.

**Gates (TS):** **`REASONING_LEGIBILITY_MIN_CHARS` = 15**; **`SLAVIC_FILTER_COSINE_THRESHOLD` = 0.80**; **`SLAVIC_TEXT_DICE_THRESHOLD` = 0.75** — **`validate.ts`**, **`score.ts`** (loosened from stub-tight defaults after live **`pnpm test:real-gates`** calibration).

---

## B2. Web triad handoff

`makeTriadFetcher(false, …)` same-origin; `POST { prompt }` → `{ candidates }`; stubs with `true`; **`middleware.ts`** `x-request-id`; **`env.ts`** for secrets (**`DEEPSEEK_API_KEY`**, **`QWEN_API_KEY`**, optional **`QWEN_BASE_URL`** → **`qwenBaseUrl`**, **`GROQ_API_KEY`** or **`LLAMA_API_KEY`**, optional **`LLAMA_GROQ_MODEL`**).

---

## C. Dock & export

| Rule | Detail |
|------|--------|
| Orb tap | Web preview only |
| Export | Client **`encodeFxp`** (`shared-engine` → `@alchemist/fxp-encoder/wasm`) when **`GET /api/health/wasm`** returns **`{ ok: true, status: "available" }`**. UI disables export when **`status`** is **`unavailable`** (stubbed glue, missing **`fxp_encoder_bg.wasm`**, or **`pkg/`** not found — see **`FIRESTARTER` §10**). |
| Health route | **`app/api/health/wasm/route.ts`** — **`dynamic = "force-dynamic"`**; resolves **`packages/fxp-encoder/pkg`** from **`process.cwd()`** (monorepo root, **`apps/web-app`**, or **`vst/`**). **No** `require.resolve("@alchemist/fxp-encoder/package.json")` (not in **`exports`** — breaks **`next build`**). |
| Frame | `MERCURY_ORB_FRAME_CLASS` |
| Tiers | `useResolvedMercuryTier` — LOD only |

---

## D. HARD GATE (one line)

No encoder / authoritative `SerumState` / real `.fxp` work without validated **`serum-offset-map.ts`** + **`tools/validate-offsets.py <path-to-init.fxp>`** on a real Serum init **`.fxp`**. **Release / CI:** **`pnpm assert:hard-gate`** or **`pnpm validate:offsets`** (same Python invocation when **`tools/sample_init.fxp`** exists); **`ALCHEMIST_STRICT_OFFSETS=1`** fails closed if the sample is absent — **`FIRESTARTER` §4**, **§9**.

---

## E. External LLM — verify → assess → suggest

**E1. Verify**  
1. Offset map + `validate-offsets.py` when `.fxp` available.  
2. `PANELIST_WEIGHTS` = **§B**.  
3. ≤8 gated candidates.  
4. Tests: `engine-harsh`, `undercover-slavic`, `triad-panel-governance`, `soe`, **`taxonomy-*`**, **`transparent-arbitration`**, **`compliant-perf-boss`**, **`talent-market-scout`**, **`learning-great-library`**, **`reliability-tablebase`** — run **`pnpm test:engine`**.  
5. **Post-verify JSON:** **`pnpm verify:harsh`** / **`pnpm verify:web`** / **`pnpm harshcheck`** invoke **`node scripts/run-verify-with-summary.mjs`** (`verify-harsh` | `verify-web`). On completion, **stderr** includes a single line with **`"event":"verify_post_summary"`** and payload: **`mode`**, **`exitCode`**, **`durationMs`**, **`failedStep`** (step label or `null`), **`monorepoRoot`**, **`soeHint`**, **`note`** (states auditable, not a hidden brain). Other stderr lines (e.g. Vitest **`logEvent`**) may appear **above** it — grep or parse the last **`verify_post_summary`** as needed.  
5b. **FIRE metrics (optional):** After green verify, **`pnpm fire:sync`** updates **`docs/FIRE.md`** between **`ALCHEMIST:FIRE_METRICS`** HTML comments (Vitest counts, Next version). Or **`ALCHEMIST_FIRE_SYNC=1`** on the same shell when running verify to run sync automatically.  
6. Triad timeouts: **`AI_TIMEOUT_MS` = 8000** (default server **`triad-panel-route`** upstream **`AbortController`** budget). **`POST /api/triad/qwen`** may pass **16_000** ms. **`runTriad` + `makeTriadFetcher`** use **`TRIAD_PANELIST_CLIENT_TIMEOUT_MS`**: **QWEN** **18_000** ms (browser → app, must cover server Qwen budget); **LLAMA** / **DEEPSEEK** **8000**.  
7. Dock `hasPresets` vs ear.  
8. `shared-types` + consumers lockstep on breaks.  
9. **`pnpm harshcheck`** / **`pnpm verify:harsh`** green; **`pnpm alc:doctor`** for env (**not** `pnpm doctor`).  
10. **Legal / security (if shipping or redistributing):** **`LEGAL.md`** / **`LICENSE`** / **`SECURITY.md`** present and accurate; AI provider **ToS** + **privacy** for your deployment; end-user **privacy/terms** if public consumer app — see **§G**.  
11. **Taxonomy bridge (if used):** Use **`rankTaxonomy`** for large lists or keep **≤ `TAXONOMY_PRE_SLAVIC_POOL_MAX` (200)** for **`narrowTaxonomyPoolToTriadCandidates`**; no **`../gates/score`**; no second arg to **`slavicFilterDedupe`**; no ad-hoc **`metadata`** — see **§H** + **`FIRESTARTER` §13`.  
12. **Transparent arbitration (if used):** Keep **`logEvent`** (`arbitration_*`); **no** Slavic bypass; **no** hidden kernels — see **§I** + **`FIRESTARTER` §7b`.  
13. **Talent market scout (if used):** **`analyzeTalentMarket`** + optional **`logTalentMarketAnalysis`**; editable **`market-benchmarks.json`**; **no** auto endpoint swap — see **§J** + **`FIRESTARTER` §7c`.  
14. **Great Library / AGL (if used):** Offline jobs only; **`GreatLibraryContext.provenance`** required; **`mergeGreatLibraryIntoSoeSnapshot`** then **`computeSoeRecommendations`**; **no** vector DB client in **`web-app`** bundle — see **§K** + **`FIRESTARTER` §7d`.  
15. **Web shell / dev (shipped):** **`next.config.mjs`** dev polling; **`dev-server.mjs`** + **`WATCHPACK_POLLING`**; **`app/error.tsx`** + **`app/global-error.tsx`**; **`LegalDisclaimer`**; root **`pnpm dev`** direct (optional **`dev:turbo`**); **`turbo.json`** **`envMode: loose`**; **`pnpm run clean`** / **`web:rebuild`** if **`.next`** corrupt — see **§L** + **`FIRESTARTER` §8**.  
16. **Transparent compliance hygiene (optional):** **`pnpm check:transparent`** — scans **`shared-engine`** `.ts` for denylisted shadow-pattern strings (e.g. stealth verdict symbols, “amnesia” governance). **Not** a substitute for review or **`pnpm verify:harsh`**; wire into CI if desired — see **§I**, **`FIRESTARTER` Appendix C**.  
17. **WASM export / health (if shipping browser `.fxp`):** **`pnpm run build:wasm`** in **`packages/fxp-encoder`** after Rust + **`wasm32-unknown-unknown`**; **`GET /api/health/wasm`** matches client prerequisites (**§C**). **`harshcheck`** green does **not** require Rust (encoder **`pnpm build`** may stub — **`FIRESTARTER` §10**).  
18. **Toolchain PATH:** If **`pnpm`** is absent, root **`pnpm dev`** / **`pnpm harshcheck`** still work when invoked as **`npm run dev`** / **`npm run harshcheck`** at root (they call **`with-pnpm.mjs`**). **`pnpm alc:doctor`** remains **`node scripts/doctor.mjs`** — no **`pnpm`** required to run the doctor script itself.  
19. **Triad HTTP vs gates:** **`GET /api/health`** includes **`triad.panelistRoutes`**: **`"stub"`** or **`"mixed"`** (≥1 live panelist), **`triad.livePanelists`**, **`triad.triadFullyLive`** (all three keyed), **`hardGate.pythonValidate`**, **`telemetry.logEvent`** (stderr JSON). Per route: **`fetcher`** when the matching env key is set — **`FIRESTARTER` §5a**.  
20. **Offset validation (optional CI):** **`pnpm validate:offsets`** and **`pnpm assert:hard-gate`** run **`tools/validate-offsets.py`** with the **`.fxp`** path when **`tools/sample_init.fxp`** exists (the assert script prints an explicit OK on success). With **`ALCHEMIST_STRICT_OFFSETS=1`**, exits **1** if the sample is missing (fail closed). **Never** invoke **`validate-offsets.py`** without the required **`fxp_path`** argument.  
21. **Git root (recovery):** **`git rev-parse --show-toplevel`** must equal the monorepo root (path containing **`apps/`** + **`packages/`**). If it resolves to **`$HOME`**, remove mistaken **`~/.git`** and re-init or clone — see **`FIRESTARTER` §2a**. **HTTPS push:** personal GitHub username + PAT (fine-grained **resource owner** = **user**, not org); org **SSO** authorize token if required.

**E2. Assess** — #1 vs export; a11y; WASM / speech / timeout UX.

**E3. Suggest** — discard telemetry; idempotent export; optional E2E. **Gate calibration (observation-only):** **`pnpm test:real-gates`** with **`BASE_URL`** matching the dev banner — stderr **`calibration_*`** via **`logEvent`**; artifact **`tools/gate-calibration-output.json`** — does **not** change **`validate.ts`** / **`score.ts`** thresholds (**`FIRESTARTER` §9**).

**Output:** `VERIFY:` → `RISKS:` → `SUGGEST:` → `PATCH HINTS:`.

---

## F. Transmutation & outside audit (TS layer only)

**Meaning:** “Transmutation” = **policy/telemetry-driven behavior** of the preset pipeline (governance, SOE hints, gate strictness) — **not** swapping audio DSP kernels, AU buffers, or C++ `TransmutationSwitch` in this repo.

| Layer | File(s) | Role |
|-------|---------|------|
| Governance | `triad-panel-governance.ts` | Health scores; **`athena_soe_recalibration`** if velocity &lt; 0.7 |
| SOE | `soe.ts` | Hints from aggregates — **no** `fs` / `child_process` |
| Gates | `validate.ts`, `score.ts` | Undercover + legibility (**≥15** char **`reasoning`**) + Slavic (**param** cosine **0.80** + optional **Dice** **0.75** on legibility text) |
| Triad | `triad.ts`, `triad-panel-route.ts`, `fetch-*-candidates.ts`, `triad-llm-normalize.ts`, API routes | Parallel panelists — **no** runtime self-rewrite; optional **keyword tablebase** short-circuit → **`triad_run_*`** **`mode: "tablebase"`**; each **`/api/triad/*`** → **`fetcher`** when its provider env key is set, else **stub** — client **`runTriad`** + **`scoreCandidates`** still apply real gates |
| Taxonomy (offline → 8) | `taxonomy/engine.ts`, `taxonomy/sparse-rank.ts`, `taxonomy/README.md` | **`rankTaxonomy`** for large lists; engine **≤200** rows; **`scoreCandidates`** path; **`shared-engine` index** |
| Arbitration (opt-in) | `arbitration/transparent-arbitration.ts`, `arbitration/types.ts` | **2-of-3** vote on order strategy; **telemetry**; **no** Slavic bypass |
| Perf audit (opt-in) | `perf/compliant-perf-boss.ts`, `perf/README.md` | **`perf_boss_*`** timings; **no** shadow / triad override |
| Talent scout (opt-in) | `talent/market-scout.ts`, `talent/market-benchmarks.json`, `talent/README.md` | Compare triad health to **operator** rows; **`talent_market_analysis`** if logged; **no** runtime route mutation |
| Great Library / AGL (opt-in) | `learning/great-library.ts`, `learning/offline-pipeline-types.ts`, `learning/README.md` | Offline **`SoeTriadSnapshot`** merge + provenance; **`great_library_soe_merge`** if logged; **no** scraper / vector client here |
| WASM / `.fxp` export (browser) | `app/api/health/wasm/route.ts`, `shared-engine/encoder.ts`, `packages/fxp-encoder/pkg/*`, `scripts/skip-if-no-rust.cjs`, `scripts/clear-stub-marker.cjs` | Health **`force-dynamic`**; client **`encodeFxp`** only when real wasm-pack artifacts + non-stub **`fxp_encoder.js`**; stub path removes stale **`.wasm`** to avoid lying UI (**`FIRESTARTER` §10**) |
| Web shell & dev (product) | `next.config.mjs`, `scripts/dev-server.mjs`, **`scripts/with-pnpm.mjs`**, `app/error.tsx`, `app/global-error.tsx`, `components/legal/LegalDisclaimer.tsx`, root `turbo.json` (**`envMode: loose`**), root `package.json` (**`dev`** / **`dev:turbo`**, etc.) | Dev **EMFILE**; **`pnpm`** optional on PATH (**`npx pnpm@9.14.2`** fallback); Next resolve from app or repo root; segment + **root** error UI; **`.next`** recovery — **`§L`** |
| Git / GitHub (ops) | **`scripts/git-save.mjs`**, **`scripts/github-first-push.mjs`**, **`RUN.txt`** | **`pnpm save`** / **`pnpm github:first-push`**; **`origin`** URL; do not **`git init`** in **`$HOME`** — **`§E1.21`**, **`FIRESTARTER` §2a** |

**Greek ↔ panelist (audit):** ATHENA=`DEEPSEEK` 0.40; HERMES=`LLAMA` 0.35 (velocity = **triad wall time**, not DAW ms); HESTIA=`QWEN` 0.25.

**Artifact checklist:** `triad-panel-governance.ts`, `soe.ts`, `triad-monitor.ts`, `triad.ts`, `validate.ts`, `score.ts`, `constants.ts`, `reliability/tablebase-schema.ts`, `reliability/tablebase-db.ts`, `reliability/checkers-fusion.ts`, `taxonomy/engine.ts`, `taxonomy/sparse-rank.ts`, `arbitration/transparent-arbitration.ts`, `perf/compliant-perf-boss.ts`, `talent/market-scout.ts`, `talent/market-benchmarks.json`, `learning/great-library.ts`, `tools/preset-metadata-schema.example.json`, **`scripts/with-pnpm.mjs`**, `scripts/run-verify-with-summary.mjs`, **`scripts/sync-fire-md.mjs`** (**`pnpm fire:sync`**), **`scripts/git-save.mjs`**, **`scripts/github-first-push.mjs`**, **`scripts/check-no-shadow-patterns.mjs`**, `scripts/doctor.mjs`, `apps/web-app/next.config.mjs`, `apps/web-app/scripts/dev-server.mjs`, `apps/web-app/components/ui/MercuryBall.tsx`, `apps/web-app/app/error.tsx`, `apps/web-app/app/global-error.tsx`, **`apps/web-app/app/api/health/wasm/route.ts`**, `packages/fxp-encoder/scripts/skip-if-no-rust.cjs`, **`packages/fxp-encoder/scripts/clear-stub-marker.cjs`**, `tests/*.test.ts`, **`alchemist-dsp-vs-ts-gates.mdc`**. **Stale `.next`:** weird **`MODULE_NOT_FOUND`** during **`next build`** / Turbo → **`pnpm run clean`** (root) then rebuild (**`pnpm web:rebuild`**).

**Red-team (expect No):** Undercover = saturator? Slavic = biquad? Athena = plugin binary? `runTriad` toggles audio buffer ms? **`analyzeTalentMarket`** auto-rewrites **`/api/triad/*`** or purges logs? **AGL** runs inside **8s** triad path, scrapes without license, or mutates **`PANELIST_WEIGHTS`** without deployer config? **`error.tsx`** hides **`console`** / telemetry for triad failures?

**Auditor paste template:**

```text
TRANSMUTATION_AGENT_ASSESSMENT (Alchemist)
REPO_ROOT: <path>  DATE: <ISO>

VERIFY:
- harshcheck / verify:harsh: [PASS/FAIL]
- verify_post_summary (stderr JSON): [captured Y/N — mode, exitCode, soeHint]
- PANELIST_WEIGHTS: [PASS/FAIL]
- Governance + SOE tested: [PASS/FAIL]
- DSP mislabel (Undercover/Slavic): [PASS/FAIL — TS-only]
- HARD GATE: [PASS/FAIL]
- Legal / security (§G): [PASS/FAIL/N/A — ship/redist only]
- Taxonomy bridge (§H): [PASS/FAIL/N/A]
- Transparent arbitration (§I): [PASS/FAIL/N/A]
- Talent market scout (§J): [PASS/FAIL/N/A — if product uses analyzeTalentMarket / logTalentMarketAnalysis]
- Great Library / AGL (§K): [PASS/FAIL/N/A — if product uses mergeGreatLibraryIntoSoeSnapshot / logGreatLibraryMerge]
- Web shell / dev (§L): [PASS — with-pnpm fallback; dev-server Next hoisting; polling; WATCHPACK default; error.tsx + global-error.tsx; LegalDisclaimer; turbo envMode loose; clean/web:rebuild for bad .next]
- WASM health / export (§C): [PASS/FAIL/N/A — GET /api/health/wasm vs client encodeFxp; build:wasm if shipping .fxp]
- Git root (§E1.21): [PASS — git rev-parse --show-toplevel equals monorepo root with apps/ + packages/; not $HOME]

RISKS: <bullets>
SUGGEST: <max 5>
PATCH_HINTS: <files>
```

---

## G. Legal, license & security (assessment hooks)

**Not legal advice.** Full table: **`FIRESTARTER.md` §14**. Root files: **`LEGAL.md`**, **`LICENSE`**, **`SECURITY.md`**.

| Check | Pass criteria |
|--------|----------------|
| **License file** | **`LICENSE`** matches intent (default: proprietary / all rights reserved; **`package.json`** `license`: **`UNLICENSED`**). |
| **Trademark hygiene** | Docs/UI do not imply **Xfer / Serum** endorsement; third-party marks acknowledged where needed (**`LEGAL.md`**). |
| **AI / data** | Deployer has a plan for **API keys**, **provider ToS**, **data sent to LLMs**, **retention** — not asserted by this repo. |
| **Telemetry** | If end users exist: collection/notice matches **applicable privacy law**; triad telemetry schema documented (**§snapshot**, **`FIRESTARTER` §7**). |
| **Security process** | **`SECURITY.md`** defines reporting path; critical vulns not only via public issues. |
| **Redistribution** | **`pnpm licenses list`** + **NOTICE** obligations understood if shipping binaries or bundled JS. |
| **Privacy (pre-launch)** | Root **`PRIVACY.md`** = **template** with placeholders; replace before public beta + LLM data flows. UI footer (**`LegalDisclaimer`**) references privacy + **third-party preset / research metadata** responsibility (**§L**). |

**Auditor:** Confirm **`LEGAL.md`** last-updated date and that **consumer** policies exist **before** a public launch (repo does not ship them).

---

## H. Taxonomy bridge (contract)

**Scope:** Post-offline pool only — see **`FIRESTARTER` §13**.

| Rule | Detail |
|------|--------|
| **Max input (engine)** | **`TAXONOMY_PRE_SLAVIC_POOL_MAX` = 200** in **`taxonomy/engine.ts`** (audits: **not** **100**). Larger → **`TaxonomyPoolTooLargeError`**. Large **~45k** lists → **`rankTaxonomy`** (keyword sparse on **`reasoning`**, **≤200** into engine) then **`narrowTaxonomyPoolToTriadCandidates`**. |
| **Pipeline** | **`scoreCandidates`** (not raw **`slavicFilterDedupe`** alone); **`SLAVIC_FILTER_COSINE_THRESHOLD` (0.80)** on **`paramArray`** plus **`SLAVIC_TEXT_DICE_THRESHOLD` (0.75)** on legible **`description` || `reasoning`** when both sides qualify — see **`score.ts`**. |
| **Imports** | From **`../score`** (no **`gates/score`** path). |
| **API** | **`rankTaxonomy(prompt, fullTaxonomy)`** + **`filterTaxonomyByPromptKeywords`** (`sparse-rank.ts`); **`narrowTaxonomyPoolToTriadCandidates`** (`engine.ts`). All **sync**; **`NarrowTaxonomyOptions.prompt`** passed through from **`rankTaxonomy`**. Exported **`@alchemist/shared-engine`**. |
| **Types** | Optional **`description`** on **`AICandidate`** is **`shared-types`**-backed; do not add opaque **`metadata`** without schema + doc update. |

**Anti-patterns:** **`taxonomy/README.md`** (table).

---

## I. Transparent arbitration (contract)

**Scope:** Opt-in ordering vote — **`FIRESTARTER` §7b**. **Not** LLAMA/DEEPSEEK/QWEN panelists.

| Rule | Detail |
|------|--------|
| **Entry** | **`runTransparentArbitration(candidates, { prompt?, runId? })`** — **`@alchemist/shared-engine`**. |
| **Votes** | **3** stages, **2-of-3** majority for **ALPHA** vs **OMEGA**; **deterministic** (**djb2** hash), **not** random. |
| **Gates** | Both strategies run **`scoreCandidates`** first; **ALPHA** = desc **`weightedScore`**; **OMEGA** = asc among survivors. |
| **Telemetry** | **`arbitration_start`**, **`arbitration_stage_vote`**, **`arbitration_final`** via **`logEvent`**. |
| **Triad** | **Default:** **not** called from **`runTriad`** — wire explicitly if product requires it. |
| **Forbidden** | Stealth / Slavic bypass / module-cache hiding — see **`alchemist-quality.mdc` §9**. **Not** a “shadow kernel,” **KGB** layer stack, **`Symbol(VERDICT)`** gate bypass, **omnipotent forced** triad mutation, **amnesia** / purged stderr / single-event-only logs, or **`v8.serialize`** wiping — those violate assessment + **§G** telemetry honesty. |
| **Hygiene (optional)** | **`pnpm check:transparent`** (root) runs **`scripts/check-no-shadow-patterns.mjs`** on **`packages/shared-engine/**/*.ts`** — regex denylist for the above **narratives as shipped code**; doc-only mentions in comments are fine if they **negate** forbidden behavior (see script header). |

**Rejected prompt pattern (do not implement):** Multi-layer **“1-2-3” shadow loops** that **enforce** outcomes, **bypass `SLAVIC_FILTER_COSINE_THRESHOLD`**, auto **model-swap** from Talent, or **purge** reasoning traces. Canonical substitutes: **§I** (logged **ALPHA/OMEGA** vote after **`scoreCandidates`**), **§J** (**`operatorReviewSuggested`** only), **§K** (**`provenance`** + **`mergeGreatLibraryIntoSoeSnapshot`**), all via **`logEvent`**.

**Tests:** **`packages/shared-engine/tests/transparent-arbitration.test.ts`**.

---

## J. Talent market scout (contract)

**Scope:** Opt-in **operator** planning helper — compares **your** triad health signals to rows in **`packages/shared-engine/talent/market-benchmarks.json`**. **Not** a second governance layer; **not** an automatic “model swap” or API hot-swap; **not** omnipotent over other **`shared-engine`** modules; **no** shadow telemetry or “amnesia” of audit logs.

| Rule | Detail |
|------|--------|
| **Entry** | **`analyzeTalentMarket({ panelistHealth?, triadHealthScore?, marketGapThreshold?, benchmarks? })`** — **`@alchemist/shared-engine`**. |
| **Data** | **`market-benchmarks.json`** — **`talents[]`** with **`id`**, **`displayName`**, **`comparativeScore`** [0,1] (**operator-maintained**, illustrative in repo; **`meta.disclaimer`**). Optional **`competesWithPanelist`**: `LLAMA` \| `DEEPSEEK` \| `QWEN`. |
| **Weakest link** | If **`panelistHealth`** provided, min score panelist wins “weakest”; else **`triadHealthScore`** alone vs top market row. |
| **Threshold** | Default **`marketGapThreshold` = 0.15** on 0–1 scale: if **`topMarket.comparativeScore − weakestScore` ≥ threshold** → **`operatorReviewSuggested: true`** (human / deploy pipeline reviews routing — engine does **not** mutate). |
| **Telemetry** | Optional **`logTalentMarketAnalysis(result, runId?)`** → **`logEvent("talent_market_analysis", { … })`** on stderr — same auditable pattern as triad / arbitration. |
| **Helpers** | **`getDefaultMarketBenchmarks()`**, **`parseMarketBenchmarksDocument(raw)`** for tests or custom JSON. |
| **Forbidden** | Auto-rewriting **`PANELIST_WEIGHTS`**, env, or **`/api/triad/*`** from this module; shadow “verdict” that bypasses gates; silent state purge. |

**Tests:** **`packages/shared-engine/tests/talent-market-scout.test.ts`**. **Doc:** **`packages/shared-engine/talent/README.md`**. **Orientation:** **`FIRESTARTER` §7c**.

---

## K. Great Library / AGL (contract)

**Scope:** **Offline** metadata bridge from batch/cron jobs into **`SoeTriadSnapshot`** for **`computeSoeRecommendations`**. **Not** real-time self-learning inside **`runTriad`**; **not** a vector database implementation; **not** GitHub/Reddit/Splice scrapers in **`shared-engine`**.

| Rule | Detail |
|------|--------|
| **Entry** | **`mergeGreatLibraryIntoSoeSnapshot(base, ctx: GreatLibraryContext)`** — **`@alchemist/shared-engine`**. |
| **Provenance** | **`ctx.provenance`** is **required** (non-empty after trim). Every numeric overlay must be traceable to an operator-attested job. |
| **Merge** | Only **`SoeTriadSnapshot`** keys **`meanPanelistMs`**, **`triadFailureRate`**, **`gateDropRate`**, **`meanRunMs`** may be overridden from **`ctx.snapshotAugment`**; invalid / non-finite numbers are ignored. |
| **SOE** | After merge, call **`computeSoeRecommendations(snapshot)`** — hints remain **heuristic**; deployer applies changes. |
| **Telemetry** | Optional **`logGreatLibraryMerge(result, runId?)`** → **`great_library_soe_merge`** via **`logEvent`**. |
| **Types** | **`learning/offline-pipeline-types.ts`** — illustrative **external** indexer shapes only. |
| **`.fxp` / bytes** | Authoritative parameter mapping stays **HARD GATE** (**`serum-offset-map.ts`** + **`validate-offsets.py`**). Example metadata batch: **`tools/preset-metadata-schema.example.json`**. |
| **Legal** | Indexing third-party presets requires **license clearance** — UI **`LegalDisclaimer`** notes provenance responsibility; full policy **`LEGAL.md`** / **`PRIVACY.md`**. |
| **Forbidden** | Omnipotent **`PANELIST_WEIGHTS`** or route mutation from AGL; hidden “intuition” without provenance; **amnesia** / silent wipe of audit history; Slavic or gate bypass “because library said so”. |

**Tests:** **`packages/shared-engine/tests/learning-great-library.test.ts`**. **Doc:** **`packages/shared-engine/learning/README.md`**. **Orientation:** **`FIRESTARTER` §7d**.

---

## L. Web shell & dev reliability (contract)

**Scope:** Next.js **product shell** — stable **local dev** in a **pnpm monorepo** and **recoverable** client UX when the App Router tree throws. **Not** triad logic; **not** DSP.

| Rule | Detail |
|------|--------|
| **Dev server** | **`apps/web-app/scripts/dev-server.mjs`** — resolves **`next/dist/bin/next`** from **`apps/web-app`** then **repo root**; picks free port **3000–3120**; **`HOST`** default **`0.0.0.0`** (**`127.0.0.1`** for loopback-only); **cyan banner** (**127.0.0.1** + **localhost** hints). Root **`pnpm dev`** / **`npm run dev`** → **`node scripts/with-pnpm.mjs --filter @alchemist/web-app dev`** → **`dev-server.mjs`** (**no** Turbo by default); **`pnpm dev:turbo`** uses **`with-pnpm.mjs exec turbo …`**. |
| **Turbo** | Root **`turbo.json`** — **`envMode: loose`**; **`globalDependencies`** on root lockfiles / workspace config for reliable remote cache invalidation. |
| **Watchpack** | When **`WATCHPACK_POLLING`** is **unset**, dev-server sets **`WATCHPACK_POLLING=true`** (all platforms) to reduce **`EMFILE: too many open files, watch`**. Opt out: **`WATCHPACK_POLLING=0 pnpm dev`**. |
| **Webpack / Next** | **`apps/web-app/next.config.mjs`** — in **`dev`**, **`watchOptions`** **polling** for **server and client** compilers; **`config.cache = false`** in dev (reliable vs corrupt packs). **`transpilePackages`**: **`@alchemist/*`**. **`experimental.optimizePackageImports`**: **`@react-three/fiber`**, **`@react-three/drei`**. |
| **Error UI** | **`app/error.tsx`** — segment error boundary (**Try again** / reload, hints). **`app/global-error.tsx`** — root layout failures (own **`html`/`body`**). Both log to **`console.error`**. |
| **`.next` / Turbo cache** | Corrupt or mixed outputs can yield **`MODULE_NOT_FOUND`** or **`PageNotFoundError` / `ENOENT`** for App Router segments (e.g. **`/api/health`**) during **“Collecting page data”**. Recovery: **`pnpm run clean`** (deletes **`apps/web-app/.next`**) / **`node scripts/with-pnpm.mjs run clean`**, then **`pnpm install`** if needed, then **`pnpm harshcheck`** or **`pnpm dev`**. **`pnpm web:rebuild`** = clean + forced **`next build`** for web-app. |
| **Legal footer** | **`components/legal/LegalDisclaimer.tsx`** — trademarks + AI/privacy pointer + **third-party preset / indexing** responsibility (not a substitute for counsel). |
| **WASM health** | **`GET /api/health/wasm`** — JSON **`ok`**, **`status`** (`available` \| `unavailable`), **`message`** (operator hint). Run **`pnpm dev`** / **`harshcheck`** from monorepo root (or **`vst/`** scripts that **`cd ..`**) so **`cwd`** resolves **`packages/fxp-encoder/pkg`**. |
| **Ops** | **`pnpm alc:doctor`** (= **`node scripts/doctor.mjs`**); **`RUN.txt`**; **`vst/README.md`**; **`scripts/with-pnpm.mjs`**; **`FIRESTARTER` §8–§10**. |

**Forbidden** (audit): Silently swallowing production errors with no user feedback; claiming **`LegalDisclaimer`** replaces **`PRIVACY.md`** / counsel for a consumer launch.

**Orientation:** **`FIRESTARTER` §8**. **Red-team:** **`§F`** row “Web shell & dev”.

---

**Footer:** **`FIRESTARTER.md`** holds **recovery-grade** operational truth (rebuild-from-repo). **`FIRE.md`** holds **assessment contracts** (**§E–§L**) + **auto metrics** (**`pnpm fire:sync`**). If §E–L grow unwieldy, split behind versioned filenames — until then, this file stays the assessment **law** alongside FIRESTARTER.
