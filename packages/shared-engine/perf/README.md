# Compliant perf “boss” (`compliant-perf-boss.ts`)

**Not** shadow / KGB governance. This is a **fully logged** timing sweep over **`shared-engine`** hot paths, aligned with **FIRE** and **`logEvent`** (`perf_boss_*`).

## What it does

- Times: **`filterValid`**, **`slavicFilterDedupe`**, **`scoreCandidates`**, taxonomy **`narrowTaxonomyPoolToTriadCandidates`** / **`rankTaxonomy`**, **`runTransparentArbitration`**, **`computeTriadGovernance`**, **`computeSoeRecommendations`**.
- Emits **`perf_boss_start`**, **`perf_boss_check`**, **`perf_boss_summary`** — grep JSON on stderr.
- **Soft budgets** (`warnThresholdMs`): exceeding logs `withinBudget: false` — **no throw**.

## What it does *not* do

- No bypass of **Slavic** / **`scoreCandidates`**.
- No hidden **`runTriad`** override.
- No omission of telemetry (that would violate **FIRE §I** spirit and project rules).

## Monorepo “all modules”

| Layer | How to measure cost |
|-------|---------------------|
| **`shared-engine`** | **`runCompliantPerfBoss()`** or **`pnpm perf:boss`** |
| **Types + engine tests + `next build`** | **`pnpm harshcheck`** / **`pnpm verify:harsh`** |
| **Rust / WASM** | Separate **`cargo`** / **`wasm-pack`** when you enable the encoder |

## API

```ts
import { runCompliantPerfBoss } from "@alchemist/shared-engine";

const { runId, checks, totalMs, warningCount } = runCompliantPerfBoss({
  runId: "ci-1",
  warnThresholdMs: 150,
});
```
