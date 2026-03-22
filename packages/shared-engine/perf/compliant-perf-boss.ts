/**
 * **Compliant perf “boss”** — single audit entry for hot paths in `shared-engine`.
 *
 * This is the **opposite** of shadow/KGB: every check is **`logEvent`**’d (`perf_boss_*`),
 * typed, deterministic work only — **no** Slavic bypass, **no** hidden triad override,
 * **no** `Math.random()` verdicts.
 *
 * **Scope:** `shared-engine` timings only. Full monorepo cost = **`pnpm harshcheck`**
 * (typecheck + Vitest + `next build`). See **`perf/README.md`**.
 */
import type { AICandidate, SerumState } from "@alchemist/shared-types";
import { logEvent } from "../telemetry";
import { scoreCandidates, slavicFilterDedupe } from "../score";
import { filterValid } from "../validate";
import { narrowTaxonomyPoolToTriadCandidates } from "../taxonomy/engine";
import { rankTaxonomy } from "../taxonomy/sparse-rank";
import { runTransparentArbitration } from "../arbitration/transparent-arbitration";
import { computeSoeRecommendations } from "../soe";
import {
  computeTriadGovernance,
  DEFAULT_TRIAD_GOVERNANCE_WEIGHTS,
} from "../triad-panel-governance";

const now = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

export interface PerfBossCheck {
  id: string;
  ms: number;
  /** True when `ms` ≤ `warnThresholdMs` (or threshold disabled). */
  withinBudget: boolean;
}

export interface CompliantPerfBossResult {
  runId: string;
  checks: PerfBossCheck[];
  totalMs: number;
  warningCount: number;
}

export interface CompliantPerfBossOptions {
  /** Per-check soft budget (ms). Exceeding logs `warn: true` only — does not throw. */
  warnThresholdMs?: number;
  runId?: string;
}

function emptyState(): SerumState {
  return {
    meta: {},
    master: {},
    oscA: {},
    oscB: {},
    noise: {},
    filter: {},
    envelopes: [],
    lfos: [],
    fx: {},
    matrix: [],
  };
}

function synthCandidates(n: number, prefix: string): AICandidate[] {
  const spread = Array.from({ length: 24 }, (_, i) => ((i * 19) % 97) / 100);
  const out: AICandidate[] = [];
  for (let i = 0; i < n; i++) {
    const panelist = (["LLAMA", "DEEPSEEK", "QWEN"] as const)[i % 3];
    out.push({
      state: emptyState(),
      score: 0.4 + (i % 17) * 0.02,
      reasoning: `${prefix} ${i} texture pad`,
      panelist,
      paramArray: spread.map((x) => x + i * 0.0001),
    });
  }
  return out;
}

function timeFn(id: string, runId: string, warnThresholdMs: number, fn: () => void): PerfBossCheck {
  const t0 = now();
  fn();
  const ms = now() - t0;
  const withinBudget = ms <= warnThresholdMs;
  logEvent("perf_boss_check", {
    runId,
    id,
    module: "@alchemist/shared-engine",
    ms: Number(ms.toFixed(3)),
    warnThresholdMs,
    withinBudget,
  });
  return { id, ms, withinBudget };
}

/**
 * Run all standard hot-path timings. **Always** logs start + summary.
 * Safe to call from CI, doctor extensions, or ops cron — fully visible in stderr JSON.
 */
export function runCompliantPerfBoss(
  options: CompliantPerfBossOptions = {}
): CompliantPerfBossResult {
  const runId = options.runId ?? `perf_boss_${Date.now()}`;
  const warnThresholdMs = options.warnThresholdMs ?? 150;

  logEvent("perf_boss_start", {
    runId,
    warnThresholdMs,
    note: "FIRE-compliant perf audit — not shadow governance",
  });

  const checks: PerfBossCheck[] = [];
  const tAll = now();

  const pool80 = synthCandidates(80, "boss");
  const pool200 = synthCandidates(200, "tax");

  checks.push(
    timeFn("filterValid:80", runId, warnThresholdMs, () => {
      filterValid(pool80);
    })
  );

  checks.push(
    timeFn("slavicFilterDedupe:80", runId, warnThresholdMs, () => {
      slavicFilterDedupe(pool80);
    })
  );

  checks.push(
    timeFn("scoreCandidates:80", runId, warnThresholdMs * 2, () => {
      scoreCandidates(pool80);
    })
  );

  checks.push(
    timeFn("narrowTaxonomyPoolToTriadCandidates:120", runId, warnThresholdMs * 2, () => {
      narrowTaxonomyPoolToTriadCandidates(pool80.slice(0, 120));
    })
  );

  checks.push(
    timeFn("rankTaxonomy:200", runId, warnThresholdMs * 3, () => {
      rankTaxonomy("texture pad boss", pool200);
    })
  );

  checks.push(
    timeFn("runTransparentArbitration:12", runId, warnThresholdMs * 2, () => {
      runTransparentArbitration(pool80.slice(0, 12), {
        prompt: "perf",
        runId,
      });
    })
  );

  checks.push(
    timeFn("computeTriadGovernance", runId, warnThresholdMs, () => {
      computeTriadGovernance(
        {
          meanPanelistMs: 1200,
          triadFailureRate: 0.05,
          gateDropRate: 0.12,
        },
        DEFAULT_TRIAD_GOVERNANCE_WEIGHTS
      );
    })
  );

  checks.push(
    timeFn("computeSoeRecommendations", runId, warnThresholdMs, () => {
      computeSoeRecommendations({
        meanPanelistMs: 1200,
        triadFailureRate: 0.05,
        gateDropRate: 0.12,
      });
    })
  );

  const totalMs = now() - tAll;
  const warningCount = checks.filter((c) => !c.withinBudget).length;

  logEvent("perf_boss_summary", {
    runId,
    totalMs: Number(totalMs.toFixed(3)),
    checkCount: checks.length,
    warningCount,
    ids: checks.map((c) => c.id),
  });

  return { runId, checks, totalMs, warningCount };
}
