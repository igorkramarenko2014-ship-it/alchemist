# AIOM Technical Brief

External technical snapshot for architecture review and operations review.

## Synchronization Metadata

<!-- DOC_TRUST:BEGIN -->

Data in this document is produced by repository scripts and local verify artifacts.

- Last verification timestamp from metrics artifact: `2026-03-27T16:34:18.142Z`
- Metrics sync date from metrics artifact: `2026-03-27`
- Metrics file hash: `7202a8f543153842c76b57dfc9b6f2099391e56c42249dc909707caf415a2421`
- Source file: `docs/fire-metrics.json`

How to verify independently:

```bash
sha256sum docs/fire-metrics.json
```

Metadata freshness is within 24 hours.

<!-- DOC_TRUST:END -->

## Metrics Produced By Sync Scripts

<!-- DOCS_SYNC:BEGIN -->

Producer: `pnpm fire:sync` (`scripts/sync-fire-md.mjs` + `scripts/sync-external-brief.mjs`)
Primary sources:
- `docs/fire-metrics.json`
- `artifacts/verify/verify-post-summary.json` (or `.artifacts/verify/verify-post-summary.json`)

| Metric | Value | Definition | Source | Independent check |
|--------|-------|------------|--------|-------------------|
| Tests passed | 316 | Total passing tests in latest shared-engine Vitest run | `docs/fire-metrics.json` (`vitestTestsPassed`) | `jq '.vitestTestsPassed' docs/fire-metrics.json` |
| IOM coverage | 1.000 | Ratio of mapped IOM cells covered in verify summary | `artifacts/verify/verify-post-summary.json` (`iomCoverageScore`) | `jq '.iomCoverageScore' artifacts/verify/verify-post-summary.json` |
| MON | 117 (ready=yes) | Unified operating number resolved from verify summary first, then initiation status fallback | `artifacts/verify/verify-post-summary.json` or `docs/fire-metrics.json` (`initiationStatus`) | `jq '{minimumOperatingNumber117, minimumOperatingReady}' artifacts/verify/verify-post-summary.json` and `jq '.initiationStatus' docs/fire-metrics.json` |
| PNH immunity count | 25 | `totalScenarios - breaches` in PNH simulation summary | `artifacts/verify/verify-post-summary.json` (`pnhSimulation`) | `jq '.pnhSimulation' artifacts/verify/verify-post-summary.json` |
| WASM status | available | Browser encoder artifact availability (`available` or `unavailable`) | `artifacts/verify/verify-post-summary.json` (`wasmStatus`) | `jq '.wasmStatus' artifacts/verify/verify-post-summary.json` |
| Sync date (UTC) | 2026-03-27 | Date written by metrics sync script | `docs/fire-metrics.json` (`syncedDateUtc`) | `jq '.syncedDateUtc' docs/fire-metrics.json` |

Re-sync procedure (if any metric shows unknown):
1. Run `pnpm verify:harsh`
2. Confirm expected fields exist in `artifacts/verify/verify-post-summary.json`
3. Run `pnpm fire:sync`
4. Resolution owner: engineering operator on duty

<!-- DOCS_SYNC:END -->

## Runtime Status Endpoint

Runtime status endpoint:

- `GET /api/health/truth-matrix`

Example:

```bash
curl -sS "http://127.0.0.1:3000/api/health/truth-matrix"
```

If values in this brief and the runtime endpoint diverge, refresh this document with `pnpm fire:sync` and review why artifacts differ.
