# Talent market scout

**Purpose:** Compare **your** triad telemetry (per-panelist or aggregate health) to **operator-maintained** rows in **`market-benchmarks.json`**.

## FIRE / compliance

- **Not** shadow governance and **not** omnipotent: the engine **never** hot-swaps API endpoints or overrides `shared-engine` gates.
- **No** “amnesia” narrative: full **`talent_market_analysis`** events go through **`logEvent`** (stderr JSON) when you call **`logTalentMarketAnalysis`**.
- **Frugality:** rows may mark `freeTierOriented`; that is documentation for humans — billing remains the deployer’s responsibility.

## Files

| File | Role |
|------|------|
| **`market-benchmarks.json`** | Editable comparative scores + `meta.disclaimer` |
| **`market-scout.ts`** | `analyzeTalentMarket`, `logTalentMarketAnalysis`, `parseMarketBenchmarksDocument` |
| **`vendor/whatmodels/`** | MIT snapshot from [BenD10/whatmodels](https://github.com/BenD10/whatmodels) (`models.json`, `gpus.json`). Refresh: **`pnpm talent:sync-whatmodels`**. See **`vendor/whatmodels/README.md`**. |

## Usage

```typescript
import {
  analyzeTalentMarket,
  logTalentMarketAnalysis,
} from "@alchemist/shared-engine";

const r = analyzeTalentMarket({
  panelistHealth: { LLAMA: 0.55, DEEPSEEK: 0.9, QWEN: 0.7 },
  marketGapThreshold: 0.15,
});
if (r.operatorReviewSuggested) logTalentMarketAnalysis(r, runId);
```

Update **`market-benchmarks.json`** from **your** eval harness — the shipped numbers are **illustrative** only.
