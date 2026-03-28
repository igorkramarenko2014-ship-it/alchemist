# AIOM Technical Brief

External technical snapshot for architecture review and operations review.

## System Overview

AIOM is a verification-driven metrics framework that aggregates test results, runtime signals, and integrity checks into a single canonical truth artifact used to assess system readiness.

- `shared-engine`: core validation and scoring layer evaluated by verify/test flows
- `IOM cells`: coverage units used in verification completeness reporting
- `PNH simulation`: scenario-based resilience checks summarized into immunity metrics

This document is an externally verifiable snapshot derived from repository artifacts.

## Synchronization Metadata

<!-- DOC_TRUST:BEGIN -->

Data in this document is produced by repository scripts and canonical truth artifacts.

- Document schema version: `v1.3`
- Last verification timestamp from canonical truth artifact: `2026-03-28T16:14:36.405Z`
- Metrics sync timestamp from canonical truth artifact: `2026-03-28T16:14:36.376Z`
- Truth file hash: `3fbf8833b16e2647583c77ff7bf30697b5422152a5c965710c2eda9bf6e7c0f1`
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
| Tests passed | 338 / 338 | `metrics.testsPassed == metrics.testsTotal` | Total passing tests in latest shared-engine Vitest run | `artifacts/truth-matrix.json` (`metrics.testsPassed`, `metrics.testsTotal`) | `jq '.metrics | { testsPassed, testsTotal }' artifacts/truth-matrix.json` |
| IOM coverage | 1.000 | `0.000 <= metrics.iomCoverageScore <= 1.000` | Ratio of mapped IOM cells covered in canonical truth artifact | `artifacts/truth-matrix.json` (`metrics.iomCoverageScore`) | `jq '.metrics.iomCoverageScore' artifacts/truth-matrix.json` |
| MON | value=117, ready=true | `metrics.mon.value == 117 and metrics.mon.ready == true` for release-ready posture | Unified operating number resolved in canonical truth artifact | `artifacts/truth-matrix.json` (`metrics.mon`) | `jq '.metrics.mon' artifacts/truth-matrix.json` |
| PNH immunity | 25 / 25 (breaches: 0) [clean] | `metrics.pnhImmunity.status in {clean, breach}` | Scenario-based resilience result from canonical truth artifact | `artifacts/truth-matrix.json` (`metrics.pnhImmunity`) | `jq '.metrics.pnhImmunity' artifacts/truth-matrix.json` |
| WASM status | available | Value is one of `available` or `unavailable` | Browser encoder artifact availability | `artifacts/truth-matrix.json` (`metrics.wasmStatus`) | `jq '.metrics.wasmStatus' artifacts/truth-matrix.json` |
| Sync timestamp (UTC) | 2026-03-28T16:14:36.376Z | ISO 8601 timestamp | Time written by truth aggregation script | `artifacts/truth-matrix.json` (`metrics.syncedAtUtc`) | `jq '.metrics.syncedAtUtc' artifacts/truth-matrix.json` |
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

## Runtime Status Endpoint

Runtime status endpoint:

- `GET /api/health/truth-matrix`

Example:

```bash
curl -sS "http://127.0.0.1:3000/api/health/truth-matrix"
```

**Snapshot vs live:** `artifact` is the **canonical snapshot** from `artifacts/truth-matrix.json` (1:1). `canonicalMetrics` is `artifact.metrics` (backward-compatible alias). **`live`** is **runtime-only** health (API / triad / WASM checks + `checkedAtUtc`); it is **never** merged into `artifact`. Stale snapshots (`freshnessStatus: stale_data`) force `live.status` to **`degraded`** or **`down`**, never **`ok`**.

Expected top-level fields (minimum contract):

```json
{
  "artifact": { "schemaVersion": 2, "metrics": { }, "divergences": [] },
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

## Glossary

| Term | Definition |
|------|------------|
| AIOM | Verification-driven metrics framework that aggregates test results, runtime signals, and integrity checks into a single canonical truth artifact used to assess system readiness. |
| IOM cell | Atomic unit of verification coverage used to track completeness of the orchestrator map in the shared-engine. |
| PNH simulation | Scenario-based resilience testing suite that simulates potential failure modes and produces immunity metrics (passed / total / breaches). |
| MON | Minimum Operating Number — stored only as `metrics.mon.{value,ready,source}` on the artifact. Display strings such as `117/117_READY` are **derived** for humans; **117** is a release-invariant target when initiator coverage is complete, not a second truth source. |
| Truth matrix | Canonical source of truth stored at `artifacts/truth-matrix.json`. All runtime metrics and verification results must match this artifact exactly. |
| Divergence | Any inconsistency between the runtime `/api/health/truth-matrix` response and the deserialized `artifacts/truth-matrix.json` (including missing fields, type mismatches, schema violations, or freshness SLA breach). |
