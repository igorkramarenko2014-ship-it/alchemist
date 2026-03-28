# AIOM Technical Brief

External technical snapshot for architecture review and operations review.

## System Overview

AIOM is a verification-driven metrics system for evaluating runtime integrity and release readiness.

- `shared-engine`: core validation and scoring layer evaluated by verify/test flows
- `IOM cells`: coverage units used in verification completeness reporting
- `PNH simulation`: scenario-based resilience checks summarized into immunity metrics

This document is an externally verifiable snapshot derived from repository artifacts.

## Synchronization Metadata

<!-- DOC_TRUST:BEGIN -->

Data in this document is produced by repository scripts and canonical truth artifacts.

- Document schema version: `v1.3`
- Last verification timestamp from canonical truth artifact: `2026-03-28T00:35:55.570Z`
- Metrics sync timestamp from canonical truth artifact: `2026-03-28T00:35:55.541Z`
- Truth file hash: `0cf28025fbdae946492bbbf9c6d17829bdb8c8b4d6357d628cea263bb777ae74`
- Source file: `artifacts/truth-matrix.json`

How to verify independently:

```bash
sha256sum artifacts/truth-matrix.json
```

Metadata freshness is within 24 hours.

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
| Sync timestamp (UTC) | 2026-03-28T00:35:55.541Z | ISO 8601 timestamp | Time written by truth aggregation script | `artifacts/truth-matrix.json` (`metrics.syncedAtUtc`) | `jq '.metrics.syncedAtUtc' artifacts/truth-matrix.json` |
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

Expected response fields (minimum contract):

```json
{
  "artifact": {
    "schemaVersion": 2,
    "metrics": {
      "mon": { "value": 117, "ready": true, "source": "verify_post_summary" },
      "testsPassed": 316,
      "testsTotal": 316,
      "iomCoverageScore": 1,
      "wasmStatus": "available",
      "pnhImmunity": { "passed": 25, "total": 25, "breaches": 0, "status": "clean" },
      "syncedAtUtc": "2026-03-27T18:00:00.000Z"
    },
    "divergences": []
  },
  "canonicalArtifactPath": "artifacts/truth-matrix.json",
  "truthArtifactGeneratedAtUtc": "2026-03-27T17:00:00.000Z",
  "divergenceCheckedAtUtc": "2026-03-27T17:00:00.000Z",
  "canonicalMetrics": { "...": "backward-compatible alias of artifact.metrics" }
}
```

`artifact` is the canonical payload surfaced 1:1 from `artifacts/truth-matrix.json`. `canonicalMetrics` remains as a backward-compatible alias. Additional fields may be present (`generatedAtMs`, `triadLivePanelists`, `rows`, `runtimeChecks`).

Runtime `artifact` payload MUST match `artifacts/truth-matrix.json` exactly. Any divergence is considered a system integrity failure.

Path contract note: canonical checks target `artifact.metrics.*` (for example `artifact.metrics.mon`, `artifact.metrics.pnhImmunity`, `artifact.metrics.syncedAtUtc`). No parallel top-level metric namespace is authoritative.

`truthArtifactGeneratedAtUtc` must be within 24h of current UTC time; otherwise system state is `stale_data`.

Divergence definition: any mismatch between runtime `artifact` and deserialized `artifacts/truth-matrix.json` (ignoring runtime-only fields), missing required fields/type mismatches, schema validation failure, or freshness SLA violation.

Expected runtime failure modes:

- `stale_data`: truth artifact timestamp is older than operational freshness policy
- `source_unreachable`: canonical truth artifact or verify summary cannot be loaded

If values in this brief and the runtime endpoint diverge, refresh this document with `pnpm fire:sync` and review why artifacts differ.

## Glossary

| Term | Definition |
|------|------------|
| AIOM | Verification-driven metrics framework that continuously evaluates runtime integrity, test coverage, and release readiness of the system. |
| IOM cell | Atomic unit of verification coverage used to track completeness of the orchestrator map in the shared-engine. |
| PNH simulation | Scenario-based resilience testing suite that simulates potential failure modes and produces immunity metrics (passed / total / breaches). |
| MON | Minimum Operating Number — the single canonical readiness scalar (`metrics.mon.value` and `metrics.mon.ready`). A value of 117 with `ready: true` indicates the system is considered release-ready. |
| Truth matrix | Canonical source of truth stored at `artifacts/truth-matrix.json`. All runtime metrics and verification results must match this artifact exactly. |
| Divergence | Any inconsistency between the runtime `/api/health/truth-matrix` response and the deserialized `artifacts/truth-matrix.json` (including missing fields, type mismatches, schema violations, or freshness SLA breach). |
