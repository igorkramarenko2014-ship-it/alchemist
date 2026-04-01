import { type TokenUsageMetrics, type Panelist } from "@alchemist/shared-types";

export interface TokenLedger {
  version: number;
  window: {
    totalRequests: number;
    totalActualTokens: number;
    totalBaselineTokens: number;
    totalSavedTokens: number;
    savingsPercent: number;
  };
  byProvider: Record<string, {
    actual: number;
    baseline: number;
    saved: number;
  }>;
  lastUpdatedUtc: string;
}

export function createEmptyLedger(): TokenLedger {
  return {
    version: 1,
    window: {
      totalRequests: 0,
      totalActualTokens: 0,
      totalBaselineTokens: 0,
      totalSavedTokens: 0,
      savingsPercent: 0,
    },
    byProvider: {
      llama: { actual: 0, baseline: 0, saved: 0 },
      deepseek: { actual: 0, baseline: 0, saved: 0 },
      qwen: { actual: 0, baseline: 0, saved: 0 },
    },
    lastUpdatedUtc: new Date().toISOString(),
  };
}

/**
 * Pure logic for recording token usage.
 * Returns the NEW ledger state but does NOT write to disk (browser-safe).
 */
export function computeTokenUsageUpdate(
  currentLedger: TokenLedger,
  params: {
    actual: Record<Panelist, TokenUsageMetrics | null>;
    baseline: Record<Panelist, number>;
  }
): TokenLedger {
  const ledger = { ...currentLedger, window: { ...currentLedger.window }, byProvider: { ...currentLedger.byProvider } };
  
  ledger.window.totalRequests += 1;
  
  const providers: Record<Panelist, string> = {
    LLAMA: "llama",
    DEEPSEEK: "deepseek",
    QWEN: "qwen",
  };

  for (const panelist of (Object.keys(params.baseline) as Panelist[])) {
    const slug = providers[panelist];
    const baselineVal = params.baseline[panelist];
    const actualVal = params.actual[panelist]?.totalTokens ?? 0;
    const savedVal = Math.max(0, baselineVal - actualVal);

    if (!ledger.byProvider[slug]) {
        ledger.byProvider[slug] = { actual: 0, baseline: 0, saved: 0 };
    } else {
        ledger.byProvider[slug] = { ...ledger.byProvider[slug] };
    }

    ledger.byProvider[slug].baseline += baselineVal;
    ledger.byProvider[slug].actual += actualVal;
    ledger.byProvider[slug].saved += savedVal;

    ledger.window.totalBaselineTokens += baselineVal;
    ledger.window.totalActualTokens += actualVal;
    ledger.window.totalSavedTokens += savedVal;
  }

  if (ledger.window.totalBaselineTokens > 0) {
    ledger.window.savingsPercent = (ledger.window.totalSavedTokens / ledger.window.totalBaselineTokens) * 100;
  }

  ledger.lastUpdatedUtc = new Date().toISOString();
  return ledger;
}
