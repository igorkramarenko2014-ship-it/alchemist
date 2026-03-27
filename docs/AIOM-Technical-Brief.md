# AIOM Technical Brief

External-facing technical snapshot for architects and auditors.

<!-- DOC_TRUST:BEGIN -->

> [!TIP]
> **Doc Trust State: nominal** — metrics are synced within the last 24h.

- Last verified UTC: **2026-03-27T01:33:36.668Z**
- Synced date UTC: **2026-03-27**
- Metrics SHA-256: `238df74f7983ace980f41438e2430f01bd7f76ad750ae4e9cab980e2f4621b6a`

<!-- DOC_TRUST:END -->

## Machine Metrics

<!-- DOCS_SYNC:BEGIN -->

_Machine-synced block — do not edit by hand; run `pnpm fire:sync`._

| Signal | Value |
|--------|-------|
| Tests Passed | 301 |
| IOM Coverage | 1.000 |
| PNH Immunity Count | 23 |
| WASM Status | available |
| Synced (UTC) | 2026-03-27 |
| Verification Hash (SHA-256) | `238df74f7983ace980f41438e2430f01bd7f76ad750ae4e9cab980e2f4621b6a` |

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
