# FIRE — extensions (assessment §G–K, §N)

Legal, taxonomy, arbitration, talent, Great Library, outside-assessment shell — satellite of **`docs/FIRE.md`**.

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

### I2. Triad circuit breaker (optional — not default routes)

**Scope:** **`TriadCircuitBreaker`** + **`withTriadCircuitBreaker`** in **`packages/shared-engine/circuit-breaker.ts`**. **Resilience helper** for high **failure rates** in a sliding window — **not** transparent arbitration (§I table above) and **not** a second governance plane.

| Rule | Detail |
|------|--------|
| **Default** | **No** import from **`app/api/triad/*`** in the shipped tree — wire only if deployers explicitly opt in. |
| **Behavior** | **Closed** → track recent success/failure outcomes; when rate ≥ **`failureRateThreshold`** after **`minSamplesToTrip`**, transition **open** (block **`allowRequest`**). After **`openDurationMs`**, **half_open** (probe); **`halfOpenSuccessNeeded`** successes → **closed**. |
| **Fallback** | **`withTriadCircuitBreaker(breaker, fn, fallback?)`** — on block, optional **`fallback`** **`Promise`** (e.g. tablebase-only path); must remain **auditable** (log + product copy), **not** a Slavic/gate bypass. |
| **Telemetry** | **`circuit_breaker_opened`**, **`circuit_breaker_half_open`**, **`circuit_breaker_closed`**, **`circuit_breaker_blocked`**, **`circuit_breaker_reset`**. |
| **Tests** | **`packages/shared-engine/tests/circuit-breaker.test.ts`**. |

**Rejected pattern:** Omnipotent circuit breaker that **hides** triad failures, **purges** stderr, or **rewrites** **`PANELIST_WEIGHTS`** / routes without deployer config.

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

## N. Outside assessment shell (ex–Brain+)

**Two verify lanes (honesty):**

| Lane | Meaning | Typical signals |
|------|---------|-----------------|
| **`green_core`** | Types + **`shared-engine`** Vitest (+ PNH slice on **`verify-harsh`**) | **`verify_post_summary.verifyLaneLabel`**, **`exitCode: 0`** |
| **Release-ready** | Browser **`.fxp`** / authoritative bytes | **`releaseReadyFromSummary: true`**, **`pnpm predeploy`**, **`harshcheck:wasm`**, **`ALCHEMIST_RELEASE_AUDIT=1 pnpm health:audit`** |

**Stub ↔ live delta (operator):** **`pnpm triad:parity-diff`** — JSON on stdout; stub always runs; live HTTP fetchers run when keys exist and **`TRIAD_PARITY_BASE_URL`** / **`BASE_URL`** points at a running web-app (same idea as **`scripts/calibrate-gates.ts`**).

### § Human deltas (edit per release)

| Field | Value (you edit) |
|-------|------------------|
| **Top risk today** | WASM stub vs real **`pkg/`**; triad stub vs fetcher parity; HARD GATE sample **`.fxp`** in CI; taxonomy pools **>200** without **`rankTaxonomy`**. |
| **What we want from reviewers** | **`igor:ci`** in CI; optional **`ALCHEMIST_SOE_*`** on **`GET /api/health`**; Panelist DNA in **`triad-panelist-system-prompt.ts`**. |
| **Last manual refresh** | _date — note what changed_ |

### Improvement prompts (for outsiders)

1. Given **HARD GATE**, where could we **accidentally** ship non-validated bytes?
2. Where do **stub** triad / missing keys **diverge** from production behavior?
3. List **single points of failure** in prompt → triad → gates → export.
4. What **tests** are missing for **Slavic + Undercover** edge cases?
5. Is **`verify_post_summary`** sufficient for your SIEM / audit trail needs?

