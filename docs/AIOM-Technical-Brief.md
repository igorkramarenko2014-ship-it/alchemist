# AIOM Technical Brief

This brief describes the operational purpose of AIOM (Alchemist integrity and orchestration metrics) and the **canonical readiness artifact** (`artifacts/truth-matrix.json`, referred to here as the **truth matrix**) used to assess release and runtime trust posture. External technical snapshot for architecture review and operations review.

## System Overview

**Purpose.** The Alchemist monorepo ships a TypeScript web application, shared packages, and optional WASM-backed encoder tooling. **`shared-engine`** is the library that implements preset-candidate validation and scoring (statistical gates, deduplication, ranking), triad-adjacent governance helpers, and related test-covered logic that `pnpm verify:harsh` exercises. **AIOM** does not replace those gates; it **aggregates** selected verification outputs, WASM posture, and orchestrator coverage signals into one **machine-readable snapshot** so operators can answer whether the repo’s **declared** integrity inputs are aligned and fresh enough to trust for a given decision.

**Major components.** The **truth matrix** (canonical readiness artifact) is produced by `pnpm fire:sync` from `verify_post_summary` data and metrics files. **`learningOutcomes`** (candidate success rate, mean best score with lessons, order-change rate, taste cluster hit rate) is copied from **`artifacts/learning-fitness-report.json`** when present, or an explicit default structure if missing — it is explicitly **non-authoritative** (`authoritative: false`); it does **not** affect **MON**, **`integrityStatus`**, or readiness math. **IOM cells** (coverage units in the Igor orchestration map) feed **IOM coverage** scores. **PNH simulation** (scenario-based resilience tests) feeds immunity summaries. Runtime exposure is **`GET /api/health/truth-matrix`**, which serves the committed artifact **plus** separate **`live`** checks (API, triad, WASM).

**Who uses this.** **Engineering** runs verify and sync and owns fixes when metrics regress. **Release managers** use the snapshot for **readiness signals** (tests, coverage, WASM, MON). **Operations / DevOps / SRE** monitor freshness, endpoint health, and audit trails. **Architecture reviewers** use this brief and the artifact contract to judge whether integrity reporting is explicit, bounded, and testable.

**Decision the artifact enables.** The truth matrix supports **release and runtime trust decisions**: whether to treat the repo as **consistent with the last green verify**, whether the **snapshot is fresh** under policy, and whether **runtime** serving of the artifact matches disk—**not** whether the product is “correct” in a business sense (see Known Limitations).

## Primary Use Cases

- **Release readiness gating** — Compare tests, IOM coverage, PNH immunity, WASM availability, and MON against policy before tagging or promoting a build; use alongside (not instead of) full verify and domain sign-off.
- **Post-sync integrity verification** — After `pnpm fire:sync`, confirm `artifacts/truth-matrix.json` validates, hashes match documentation, and `jq` spot-checks match the metrics table.
- **Runtime vs canonical comparison** — Call `GET /api/health/truth-matrix` and compare `artifact` to the on-disk file to detect drift, schema issues, or freshness violations.
- **CI / verification audit trail** — Tie a commit to a hashed truth matrix and `verify_post_summary` inputs for post-incident review (stderr `verify_post_summary` remains the primary audit line for the verify run itself).
- **Operator troubleshooting** — When `freshnessStatus`, `integrityStatus`, or `divergences` fail, determine whether the cause is stale sync, dev/test posture, environment reachability, or a real mismatch.

## Synchronization Metadata

<!-- DOC_TRUST:BEGIN -->

Data in this document is produced by repository scripts and canonical truth artifacts.

- Document schema version: `v1.3`
- Last verification timestamp from canonical truth artifact: `2026-03-30T12:10:57.582Z`
- Metrics sync timestamp from canonical truth artifact: `2026-03-30T12:10:57.547Z`
- Truth file hash: `56bae1cdb47e5a9ad7492025aa05090cc9417faf257effba717baa082822b586`
- Source file: `artifacts/truth-matrix.json`

How to verify independently:

```bash
sha256sum artifacts/truth-matrix.json
```

Snapshot freshness is within policy (120m max age; prod default 15m, dev default 2h unless overridden).

Interpretation note: values listed here are raw system metrics. They do not imply correctness without independent verification.

<!-- DOC_TRUST:END -->

## Metrics Produced By Sync Scripts

<!-- DOCS_SYNC:BEGIN -->

Producer: `pnpm fire:sync` (`scripts/sync-fire-md.mjs` + `scripts/aggregate-truth.mjs` + `scripts/sync-external-brief.mjs`)
Primary sources:
- `artifacts/truth-matrix.json`

| Metric | Value | Expected | Definition | Source | Independent check |
|--------|-------|----------|------------|--------|-------------------|
| Tests passed | 391 / 391 | `metrics.testsPassed == metrics.testsTotal` | Total passing tests in latest shared-engine Vitest run | `artifacts/truth-matrix.json` (`metrics.testsPassed`, `metrics.testsTotal`) | `jq '.metrics | { testsPassed, testsTotal }' artifacts/truth-matrix.json` |
| IOM coverage | 1.000 | `0.000 <= metrics.iomCoverageScore <= 1.000` | Ratio of mapped IOM cells covered in canonical truth artifact | `artifacts/truth-matrix.json` (`metrics.iomCoverageScore`) | `jq '.metrics.iomCoverageScore' artifacts/truth-matrix.json` |
| MON | value=117, ready=true | `metrics.mon.value == 117 and metrics.mon.ready == true` for release-ready posture | Unified operating number resolved in canonical truth artifact | `artifacts/truth-matrix.json` (`metrics.mon`) | `jq '.metrics.mon' artifacts/truth-matrix.json` |
| PNH immunity | 25 / 25 (breaches: 0) [clean] | `metrics.pnhImmunity.status in {clean, breach}` | Scenario-based resilience result from canonical truth artifact | `artifacts/truth-matrix.json` (`metrics.pnhImmunity`) | `jq '.metrics.pnhImmunity' artifacts/truth-matrix.json` |
| WASM status | available | Value is one of `available` or `unavailable` | Browser encoder artifact availability | `artifacts/truth-matrix.json` (`metrics.wasmStatus`) | `jq '.metrics.wasmStatus' artifacts/truth-matrix.json` |
| Sync timestamp (UTC) | 2026-03-30T12:10:57.547Z | ISO 8601 timestamp | Time written by truth aggregation script | `artifacts/truth-matrix.json` (`metrics.syncedAtUtc`) | `jq '.metrics.syncedAtUtc' artifacts/truth-matrix.json` |
| Divergences | 0 | `length(divergences) == 0` for clean state | Canonical divergence array (runtime/artifact mismatch, schema failure, or freshness violation) | `artifacts/truth-matrix.json` (`divergences`) | `jq '.divergences | length' artifacts/truth-matrix.json` |

Re-sync procedure (if any metric shows unknown):
1. Run `pnpm verify:harsh`
2. Schema gates run automatically (`validate-truth-matrix.mjs` + `validate-fire-metrics.mjs`)
3. Run `pnpm fire:sync`
4. Resolution owner: engineering operator on duty
5. Marker integrity note: `pnpm fire:sync` validates required marker blocks and fails if markers are missing or malformed; edits inside `DOC_TRUST`/`DOCS_SYNC` blocks are overwritten.

Audit procedure:
1. Verify artifact hash: `sha256sum artifacts/truth-matrix.json`
2. Validate fields via `jq` checks in this table
3. Compare with `GET /api/health/truth-matrix` runtime response
4. Investigate and resolve any divergence before sharing

<!-- DOCS_SYNC:END -->

### MON (Minimum Operating Number) and the 117 scale

**117** is the **fixed AIOM display scale** (`ONE_SEVENTEEN_CONSTANT` in code). The mapping from initiator fabric to that scale is **implementation-defined**; **derivation history is not a contract surface.** During verify, **`verify_post_summary`** may emit `minimumOperatingNumber117` and `minimumOperatingReady`. The aggregation script stores **`metrics.mon`** from that summary. Conceptually, **MON117 = round(aiomIntegrityScore × 117)** and **`minimumOperatingReady` is true when `aiomIntegrityScore ≥ 0.9`** (see `minimumOperatingFormula` in `verify_post_summary` when present). **Value 117 with `ready: true`** means the integrity score hit the top of that scale and passed the ready threshold for this **AIOM metric lane**.

**Operational meaning when MON is below 117 or `ready` is false:** the last aggregated verify did not produce a “full scale / ready” posture for this metric, or inputs were missing—for example **`metrics.mon` with `value: 0`, `ready: false`, `source: "unresolved"`** when `verify_post_summary` did not include MON fields. That is a **signal to inspect verify outputs**, not a full diagnosis by itself.

**Equivalence to “full release.”** **`metrics.mon.value == 117` and `metrics.mon.ready == true`** are the **artifact’s** definition of **AIOM release-ready posture** for this brief. They are **not** strictly equivalent to “ship the product”: the verify pipeline itself documents stronger bars (for example WASM/HARD GATE “release” flags in `verify_post_summary`) that may still be false when MON looks good. Treat MON as **one bounded input**, not a substitute for the full release checklist.

### Artifact `divergences` array (aggregation)

The `divergences` field in **`artifacts/truth-matrix.json`** is populated at aggregation time when **`verify_post_summary` did not supply both MON fields** (`minimumOperatingNumber117` and `minimumOperatingReady`), so **`metrics.mon` falls back to `unresolved`** and a single **MON** record is written into `divergences`. When verify includes MON fields, the array is typically **empty** (stored MON matches verify). **Runtime** “divergence” (live API vs disk) is defined separately below. Always use **`jq '.divergences' artifacts/truth-matrix.json`** for the artifact’s current array.

## Operational Context (reading non-ideal snapshots)

This brief is a **point-in-time** view. **No historical time series** is stored in this document; if you need trend context, compare **git history** of `artifacts/truth-matrix.json`, prior **`verify_post_summary`** artifacts, and CI logs. The repository does **not** ship a dedicated metrics database for AIOM.

| Observation | Possible interpretations (non-exhaustive) |
|-------------|---------------------------------------------|
| **MON = 0**, **`ready = false`** | Often **`source: "unresolved"`**—verify summary lacked MON inputs; or integrity score path did not run. Can also reflect **dev/test** runs that skip parts of verify. **Not automatically** a schema attack or corruption. |
| **`ready = false`** with MON &lt; 117 | Expected when **aiomIntegrityScore** is below the ready threshold (e.g. &lt; 0.9) or inputs are partial. |
| **`Divergences` &gt; 0** | Inspect **`jq '.divergences'`** on the artifact. In the current aggregator, usually means **MON was unresolved** (verify summary lacked MON fields). Correlate with **`artifacts/verify/verify-post-summary.json`** for that commit. |
| **Stale timestamps** | **Stale artifact** (policy in `ALCHEMIST_TRUTH_MAX_AGE_MINUTES`) vs **clock skew** vs **forgotten `fire:sync`**. |

**Recommended follow-ups:** re-run **`pnpm verify:harsh`**, then **`pnpm fire:sync`**; diff **`artifacts/truth-matrix.json`** against the previous commit; read the latest **`artifacts/verify/verify-post-summary.json`**; compare **`GET /api/health/truth-matrix`** to disk.

## Runtime Status Endpoint

Runtime status endpoint:

- `GET /api/health/truth-matrix`

Example:

```bash
curl -sS "http://127.0.0.1:3000/api/health/truth-matrix"
```

**Snapshot vs live:** `artifact` is the **canonical snapshot** from `artifacts/truth-matrix.json` (1:1). `canonicalMetrics` is `artifact.metrics` (backward-compatible alias). **`live`** is **runtime-only** health (API / triad / WASM checks + `checkedAtUtc`); it is **never** merged into `artifact`. Stale snapshots (`freshnessStatus: stale_data`) force `live.status` to **`degraded`** or **`down`**, never **`ok`**.

**Illustrative JSON (schema only).** The example below shows **field shape** and typical keys. **It is not a guarantee** of current values: `divergences` may be empty or non-empty depending on the committed artifact; **`live`** timestamps and statuses change every request. For ground truth, use **`jq`** on `artifacts/truth-matrix.json` and a live **`curl`** response—**do not** assume this snippet matches the metrics table row-for-row.

Expected top-level fields (minimum contract):

```json
{
  "artifact": {
    "schemaVersion": 3,
    "metrics": {},
    "divergences": []
  },
  "canonicalMetrics": {},
  "live": {
    "status": "ok",
    "checkedAtUtc": "2026-03-28T00:00:00.000Z",
    "checks": { "api": "ok", "triad": "ok", "wasm": "ok" }
  },
  "canonicalArtifactPath": "artifacts/truth-matrix.json",
  "truthArtifactGeneratedAtUtc": "2026-03-28T00:35:55.570Z",
  "divergenceCheckedAtUtc": "2026-03-28T00:35:55.570Z",
  "freshnessStatus": "fresh",
  "integrityStatus": "ok",
  "rows": [],
  "runtimeChecks": {}
}
```

Additional snapshot fields remain for parity tooling (`rows`, `runtimeChecks`, etc.).

Runtime `artifact` payload MUST match `artifacts/truth-matrix.json` exactly. Any divergence is considered a system integrity failure.

Path contract note: canonical checks target `artifact.metrics.*` (for example `artifact.metrics.mon`, `artifact.metrics.pnhImmunity`, `artifact.metrics.syncedAtUtc`). No parallel top-level metric namespace is authoritative.

**Freshness SLA** (on `artifact.generatedAtUtc`): default **15 minutes** in production (`NODE_ENV=production`), **2 hours** in development; override with **`ALCHEMIST_TRUTH_MAX_AGE_MINUTES`**. If violated, `freshnessStatus` is `stale_data` and **`live.status` is not `ok`**.

Divergence definition: any mismatch between runtime `artifact` and deserialized `artifacts/truth-matrix.json` (ignoring runtime-only fields), missing required fields/type mismatches, schema validation failure, or **snapshot** freshness SLA violation. Transient **`live`** degradation does not by itself append artifact divergences unless the artifact contract is violated.

Expected runtime failure modes:

- `stale_data`: truth artifact timestamp is older than operational freshness policy
- `source_unreachable`: canonical truth artifact or verify summary cannot be loaded

If values in this brief and the runtime endpoint diverge, refresh this document with `pnpm fire:sync` and review why artifacts differ.

## Known Limitations

- **Snapshot, not a dashboard:** This brief and `truth-matrix.json` are **commits in time**, not a time-series or SLO dashboard.
- **Artifact ≠ business correctness:** Green metrics attest to **defined** engineering checks and aggregation inputs; they do **not** prove market fit, legal compliance, or end-user outcomes.
- **`live` vs canonical:** Runtime health and the **committed** artifact measure **different things**; a healthy API can still serve a **stale** or **internally divergent** snapshot.
- **Terminology:** Names such as **IOM**, **PNH**, and **truth matrix** are project-specific; external readers should rely on this glossary and the pairing of internal names with plain-language phrases in this document.
- **Transient environment issues:** Missing env, skipped scripts, or selective verify can depress scores or produce **`unresolved`** MON **without** indicating schema corruption.
- **Automated table rows:** The **`DOCS_SYNC`** section is **regenerated** by `pnpm fire:sync`; manual edits inside those markers are **overwritten**.

## Glossary

| Term | Definition |
|------|------------|
| AIOM | Alchemist integrity / orchestration metrics layer: aggregates verify outputs into **`artifacts/truth-matrix.json`** (the **canonical readiness artifact**) to support **trust and freshness** decisions. |
| IOM cell | **Coverage unit** in the Igor orchestration map; tracked so **IOM coverage** can report how much of the map is represented in verification. |
| PNH simulation | **Scenario-based resilience tests**; summarized as PNH immunity (passed/total/breaches) in the truth matrix. |
| MON | Minimum Operating Number — stored as `metrics.mon.{value,ready,source}` on the artifact. Display strings such as `117/117_READY` are **derived** for humans. **117** is the **enumerated initiator scale** (constant manifest count), not a second independent source of truth. |
| Truth matrix | **Canonical readiness artifact** at `artifacts/truth-matrix.json`; runtime and docs are expected to match this file **byte-for-byte** where the contract applies. |
| Divergence | **Runtime / health sense:** inconsistency between **`GET /api/health/truth-matrix`** and the deserialized artifact, or freshness/schema failures as defined in the runtime section. **Artifact sense:** see **Artifact `divergences` array** above. |
