# FIRE — core (assessment §D–F)

Satellite of **`docs/FIRE.md`**. Hub + **Assessment snapshot** remain in **`FIRE.md`**. Recovery detail → **`FIRESTARTER.md`**.

## D. HARD GATE (one line)

No encoder / authoritative `SerumState` / real `.fxp` work without validated **`serum-offset-map.ts`** + **`tools/validate-offsets.py <path-to-init.fxp>`** on a real Serum init **`.fxp`**. **Release / CI:** **`pnpm assert:hard-gate`** or **`pnpm validate:offsets`** (same Python invocation when **`tools/sample_init.fxp`** exists); **`ALCHEMIST_STRICT_OFFSETS=1`** fails closed if the sample is absent — **`FIRESTARTER` §4**, **§9**.

**CI baseline (`.github/workflows/verify.yml`):** runs **`pnpm assert:hard-gate`** then **`pnpm verify:harsh`**. Default clone often has **no** **`tools/sample_init.fxp`** (binary, frequently gitignored) — assert **warns** and exits **0**. For pipelines that must fail without a real preset, set **`ALCHEMIST_STRICT_OFFSETS=1`** and **provision** **`tools/sample_init.fxp`** (e.g. CI secret → file) before **`pnpm assert:hard-gate`**. PRs touching **`serum-offset-map.ts`**, **`packages/fxp-encoder/pkg`**, or **`tools/validate-offsets.py`** should use that stricter job or an equivalent manual gate.

**Operator CLI vs Serum hosting:** **`pnpm vst:observe`** is a **Node/TS** bridge over **`vst-bridge.ts`** (HARD GATE, IOM **`vst_observer`**) — it does **not** attach to a live Serum UI instance; the optional JUCE skeleton (**`apps/vst-wrapper`**) loads **`.fxp`** bytes in-plugin only — **`docs/vst-wrapper.md`**, **§L**.

---

## E. External LLM — verify → assess → suggest

**E1. Verify**  
1. Offset map + `validate-offsets.py` when `.fxp` available.  
2. `PANELIST_WEIGHTS` = **§B**.  
3. ≤8 gated candidates.  
4. Tests: `engine-harsh`, `undercover-slavic`, `triad-panel-governance`, `soe`, **`taxonomy-*`**, **`transparent-arbitration`**, **`compliant-perf-boss`**, **`talent-market-scout`**, **`learning-great-library`**, **`reliability-tablebase`**, **`triad-concurrency`** (stress test) — run **`pnpm test:engine`**.  
5. **Post-verify JSON:** **`pnpm verify:harsh`** / **`pnpm verify:web`** / **`pnpm harshcheck`** invoke **`node scripts/run-verify-with-summary.mjs`** (`verify-harsh` | `verify-web`). On completion, **stderr** includes a single line with **`"event":"verify_post_summary"`** and payload: **`mode`**, **`exitCode`**, **`durationMs`**, **`failedStep`** (step label or `null`), **`monorepoRoot`**, **`soeHint`**, **`note`**, and **`triadConcurrencyPass`** (boolean stress-test result). When **`ALCHEMIST_SELECTIVE_VERIFY=1`** (local **`harshcheck`** path, not **CI**), the payload may include **IOM test-health fields**: **`iomCoverageScore`** (**0–1**, ratio of **`shared-engine`** Vitest files run vs total under **`tests/`** when an IOM-mapped partial run executed), **`iomSelectiveEngineMode`**, **`iomMatchedCellIds`**, **`iomSelectiveWarnings`** (human-readable reminder that most suite files were not executed — run full **`pnpm verify:harsh`** before merge). **CI** always runs the full engine suite; **`iomCoverageScore`** is **1** when that step is green. **`soeHint`** remains a **single string** for grep-friendly logs; richer structured hints are **queued** (see **`docs/alchemist-new-moves.html`**, **`verify:capture`** / **`soe:review`**). Other stderr lines (e.g. Vitest **`logEvent`**) may appear **above** the summary — grep or parse the last **`verify_post_summary`** as needed.  
5b. **FIRE metrics (optional):** After green verify, **`pnpm fire:sync`** updates **`docs/FIRE.md`** between **`ALCHEMIST:FIRE_METRICS`** HTML comments (Vitest counts, Next version). Or **`ALCHEMIST_FIRE_SYNC=1`** on the same shell when running verify to run sync automatically.  
5c. **Igor orchestrator sync:** **`verify:harsh`** / **`verify:web`** run **`scripts/sync-igor-orchestrator.mjs --check`**. On failure: **`pnpm igor:sync`**, commit **`igor-orchestrator-packages.gen.ts`** + **`igor-orchestrator-cells.gen.ts`**. Human edits: **`igor-orchestrator-meta.json`**, **`igor-power-cells.json`** only — **not** the **`.gen.ts`** files. See **`docs/brain.md` §9d**.  
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
17. **WASM export / health (if shipping browser `.fxp`):** **`pnpm run build:wasm`** in **`packages/fxp-encoder`** after Rust + **`wasm32-unknown-unknown`**; **`GET /api/health/wasm`** matches client prerequisites (**§C**). **`pnpm assert:wasm`** (**`scripts/assert-wasm-available.mjs`**) performs the same **filesystem** checks **without** starting Next — use in **deploy** after **`build:wasm`**. Set **`REQUIRE_WASM=1`** (or **`ALCHEMIST_REQUIRE_WASM=1`**) to **exit 1** when **`pkg/`** is stubbed or missing (default without env: exit **0** with stderr note so optional CI steps can stay non-blocking). **`harshcheck`** green does **not** require Rust (encoder **`pnpm build`** may stub — **`FIRESTARTER` §10**).  
18. **Toolchain PATH:** If **`pnpm`** is absent, root **`pnpm dev`** / **`pnpm harshcheck`** still work when invoked as **`npm run dev`** / **`npm run harshcheck`** at root (they call **`with-pnpm.mjs`**). **`pnpm alc:doctor`** remains **`node scripts/doctor.mjs`** — no **`pnpm`** required to run the doctor script itself.  
19. **Triad HTTP vs gates:** **`GET /api/health`** includes **`triad.panelistRoutes`**: **`"stub"`** or **`"mixed"`** (≥1 live panelist), **`triad.livePanelists`**, **`triad.triadFullyLive`** (all three keyed), **`hardGate.pythonValidate`**, **`igorOrchestrator`** (Igor manifest — **`brain.md` §9d**), **`telemetry.logEvent`** (stderr JSON). Per route: **`fetcher`** when the matching env key is set — **`FIRESTARTER` §5a**.  
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
| Gates | `validate.ts`, `score.ts` | Undercover + legibility (**≥15** char **`reasoning`**) + Slavic (**param** cosine **0.80** + optional **Dice** **0.75** on legibility text) + **Phase 2 advisory** (transmutation shifts to weights, Slavic deltas, and priors). |
| Triad | `triad.ts`, `triad-panel-route.ts`, `fetch-*-candidates.ts`, `triad-llm-normalize.ts`, API routes | Parallel panelists — **Hardened V4 Refinery** (mandatory JSON validation + retry loops); **concurrency stress** verified; optional **keyword tablebase** short-circuit → **`triad_run_*`** **`mode: "tablebase"`**; each **`/api/triad/*`** → **`fetcher`** when its provider env key is set, else **stub** — client **`runTriad`** + **`scoreCandidates`** still apply real gates |
| Taxonomy (offline → 8) | `taxonomy/engine.ts`, `taxonomy/sparse-rank.ts`, `taxonomy/README.md` | **`rankTaxonomy`** for large lists; engine **≤200** rows; **`scoreCandidates`** path; **`shared-engine` index** |
| Arbitration (opt-in) | `arbitration/transparent-arbitration.ts`, `arbitration/types.ts` | **2-of-3** vote on order strategy; **telemetry**; **no** Slavic bypass |
| Triad circuit breaker (opt-in library) | `circuit-breaker.ts` | Sliding-window failure rate → **open** / **half_open** / **closed**; **`circuit_breaker_*`** **`logEvent`**; **not** wired to **`/api/triad/*`** by default — compose explicitly if product needs degradation + fallback |
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
