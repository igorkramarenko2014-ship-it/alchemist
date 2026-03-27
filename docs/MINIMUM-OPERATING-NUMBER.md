# Minimum Operating Number (MON)

Single readiness scalar for narrative + contract surfaces.

## Definition

- `MON` = `aiomIntegrityScore` in `verify_post_summary`
- `MON117` = `round(MON * 117)`
- `MON_READY` = `MON >= 0.9`

## Source Of Truth

- Emitted by: `scripts/run-verify-with-summary.mjs`
- Artifact path: `artifacts/verify/verify-post-summary.json`
- Human surfaces: `docs/FIRE.md`, `docs/AIOM-Technical-Brief.md`, `scripts/aiom-one-screen-status.mjs`

## Contract

- MON is **descriptive and auditable**.
- MON never overrides:
  - HARD GATE
  - triad validation/scoring gates
  - release audit checks

## Usage

```bash
pnpm verify:harsh
pnpm fire:sync
pnpm aiom:status
```

Read fields:

- `minimumOperatingNumber`
- `minimumOperatingNumber117`
- `minimumOperatingReady`

