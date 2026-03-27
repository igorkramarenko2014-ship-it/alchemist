# AIOM Technical Brief

External technical snapshot for architecture review and operations review.

## System Overview

AIOM is a verification-driven metrics system for evaluating runtime integrity and release readiness.

- `shared-engine`: core validation and scoring layer evaluated by verify/test flows
- `IOM cells`: coverage units used in verification completeness reporting
- `PNH simulation`: scenario-based resilience checks summarized into immunity metrics

This document is an externally verifiable snapshot derived from repository artifacts.

## Environment

This snapshot reflects a local verification environment.
Production validation requires querying the deployed runtime endpoint and comparing it to the canonical artifact contract.

## Synchronization Metadata

<!-- DOC_TRUST:BEGIN -->

Data in this document is produced by repository scripts and canonical truth artifacts.

- Document schema version: `v1.3`
- Last verification timestamp from canonical truth artifact: `2026-03-27T17:17:57.175Z`
- Metrics sync date from canonical truth artifact: `2026-03-27`
- Truth file hash: `d4472538d8f93eb68f72480a5a63040dce47535b3ab365c86bc4c27b96af3bb7`
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
| Tests passed | 316 | Equals `metrics.testsPassed` in canonical artifact | Total passing tests in latest shared-engine Vitest run | `artifacts/truth-matrix.json` (`metrics.testsPassed`) | `jq '.metrics.testsPassed' artifacts/truth-matrix.json` |
| IOM coverage | 1.000 | `0.000 <= metrics.iomCoverageScore <= 1.000` | Ratio of mapped IOM cells covered in canonical truth artifact | `artifacts/truth-matrix.json` (`metrics.iomCoverageScore`) | `jq '.metrics.iomCoverageScore' artifacts/truth-matrix.json` |
| MON | mon117=117, monReady=true | `metrics.mon117 == 117 and metrics.monReady == true` for release-ready posture | Unified operating number resolved in canonical truth artifact | `artifacts/truth-matrix.json` (`metrics.mon117`, `metrics.monReady`) | `jq '.metrics | { mon117, monReady, monSource, monRawStatus }' artifacts/truth-matrix.json` |
| PNH immunity | 25 / 25 (breaches: 0) | `metrics.pnhImmunityCount == metrics.pnhTotalScenarios - metrics.pnhBreaches` | Scenario-based resilience result from canonical truth artifact | `artifacts/truth-matrix.json` (`metrics.pnhImmunityCount`, `metrics.pnhTotalScenarios`, `metrics.pnhBreaches`) | `jq '.metrics | { pnhImmunityCount, pnhTotalScenarios, pnhBreaches }' artifacts/truth-matrix.json` |
| WASM status | available | Value is one of `available` or `unavailable` | Browser encoder artifact availability | `artifacts/truth-matrix.json` (`metrics.wasmStatus`) | `jq '.metrics.wasmStatus' artifacts/truth-matrix.json` |
| Sync date (UTC) | 2026-03-27 | Matches format `YYYY-MM-DD` | Date written by truth aggregation script | `artifacts/truth-matrix.json` (`metrics.syncedDateUtc`) | `jq '.metrics.syncedDateUtc' artifacts/truth-matrix.json` |
| Divergences | none | `length(divergences) == 0` for clean state | Canonical divergence array for source consistency checks | `artifacts/truth-matrix.json` (`divergences`) | `jq '.divergences | length' artifacts/truth-matrix.json` |

Re-sync procedure (if any metric shows unknown):
1. Run `pnpm verify:harsh`
2. Confirm expected fields exist in `artifacts/truth-matrix.json`
3. Run `pnpm fire:sync`
4. Resolution owner: engineering operator on duty

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
  "canonicalArtifactPath": "artifacts/truth-matrix.json",
  "canonicalMetrics": {
    "mon117": 117,
    "monReady": true,
    "testsPassed": 316,
    "wasmStatus": "available"
  }
}
```

Expected runtime failure modes:

- `stale_data`: truth artifact timestamp is older than operational freshness policy
- `source_unreachable`: canonical truth artifact or verify summary cannot be loaded

If values in this brief and the runtime endpoint diverge, refresh this document with `pnpm fire:sync` and review why artifacts differ.

## Glossary

| Term | Definition |
|------|------------|
| AIOM | System integrity metric framework and orchestration surface |
| IOM cell | Unit of verification coverage in the orchestrator map |
| PNH simulation | Scenario-based resilience suite summarized in immunity metrics |
| MON | Minimum Operating Number fields (`mon117`, `monReady`) |
| Truth matrix | Canonical artifact at `artifacts/truth-matrix.json` |
