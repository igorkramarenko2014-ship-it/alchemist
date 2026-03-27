# AIOM Technical Brief

External-facing technical snapshot for architects and auditors.

<!-- DOC_TRUST:BEGIN -->

> [!TIP]
> **Doc Trust State: nominal** — metrics are synced within the last 24h.

- Last verified UTC: **2026-03-27T01:14:47.419Z**
- Synced date UTC: **2026-03-27**
- Metrics SHA-256: `a281c2399438cb5171f5c595022f15a7a8fb04cf185bdb2382ba4ece3b912eca`

<!-- DOC_TRUST:END -->

## Machine Metrics

<!-- DOCS_SYNC:BEGIN -->

_Machine-synced block — do not edit by hand; run `pnpm fire:sync`._

| Signal | Value |
|--------|-------|
| Tests Passed | 300 |
| IOM Coverage | 1.000 |
| PNH Immunity Count | 23 |
| WASM Status | available |
| Synced (UTC) | 2026-03-27 |
| Verification Hash (SHA-256) | `a281c2399438cb5171f5c595022f15a7a8fb04cf185bdb2382ba4ece3b912eca` |

Canonical metrics source: `docs/fire-metrics.json`

<!-- DOCS_SYNC:END -->

## Live Truth Matrix

This brief is static. Runtime truth is available at:

- `GET /api/health/truth-matrix`

Verification example:

```bash
curl -sS "http://127.0.0.1:3000/api/health/truth-matrix"
```

If runtime truth differs from this brief, runtime wins and the brief must be re-synced with `pnpm fire:sync`.
