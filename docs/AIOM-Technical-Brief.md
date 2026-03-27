# AIOM Technical Brief

External-facing technical snapshot for architects and auditors.

<!-- DOC_TRUST:BEGIN -->

> [!TIP]
> **Doc Trust State: nominal** — metrics are synced within the last 24h.

- Last verified UTC: **2026-03-27T04:41:50.246Z**
- Synced date UTC: **2026-03-27**
- Metrics SHA-256: `abb1a71c609ad7014d480c55bef1904f3503518dc1016d46a436415c7732c0e5`

<!-- DOC_TRUST:END -->

## Machine Metrics

<!-- DOCS_SYNC:BEGIN -->

_Machine-synced block — do not edit by hand; run `pnpm fire:sync`._

| Signal | Value |
|--------|-------|
| Tests Passed | 314 |
| IOM Coverage | 1.000 |
| PNH Immunity Count | 23 |
| WASM Status | available |
| Synced (UTC) | 2026-03-27 |
| Verification Hash (SHA-256) | `abb1a71c609ad7014d480c55bef1904f3503518dc1016d46a436415c7732c0e5` |

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
