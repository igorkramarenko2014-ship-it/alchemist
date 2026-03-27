# AIOM Technical Brief

External-facing technical snapshot for architects and auditors.

<!-- DOC_TRUST:BEGIN -->

> [!TIP]
> **Doc Trust State: nominal** — metrics are synced within the last 24h.

- Last verified UTC: **2026-03-27T11:22:34.394Z**
- Synced date UTC: **2026-03-27**
- Metrics SHA-256: `8e53961fec8eb540926e4793c78b604a9fe252b483eb95918b8d3ae2909694c0`

<!-- DOC_TRUST:END -->

## Machine Metrics

<!-- DOCS_SYNC:BEGIN -->

_Machine-synced block — do not edit by hand; run `pnpm fire:sync`._

| Signal | Value |
|--------|-------|
| Tests Passed | 316 |
| IOM Coverage | 1.000 |
| Minimum Operating Number (MON) | unknown (MON117=unknown, ready=no) |
| PNH Immunity Count | 25 |
| WASM Status | available |
| Synced (UTC) | 2026-03-27 |
| Verification Hash (SHA-256) | `8e53961fec8eb540926e4793c78b604a9fe252b483eb95918b8d3ae2909694c0` |

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
