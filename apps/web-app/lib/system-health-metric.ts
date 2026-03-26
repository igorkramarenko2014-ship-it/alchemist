import fs from "node:fs";
import path from "node:path";

export type SystemHealthTier = "ready" | "needs_review" | "blocked" | "unknown";

export interface SystemHealthMetric {
  engineReadinessPercentile: number | null;
  engineWorthScore: number | null;
  engineWorthUnit: string | null;
  receiptsUsed: number;
  readinessTier: SystemHealthTier;
  readinessExplainer: string;

  iomJudgment: {
    iomCoverageScore: number | null;
    iomHealthTier: string | null;
    iomHealthVerdict: string | null;
    iomActiveSchisms: number | null;
    iomSchismCodes: string[];
  };
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function computePercentileFromScores(scores: number[], current: number): number | null {
  if (!Number.isFinite(current)) return null;
  const clean = scores.filter((x) => Number.isFinite(x));
  const n = clean.length;
  if (n === 0) return null;
  const le = clean.filter((x) => x <= current).length;
  // Stable definition: percentile = P(X <= current) under empirical sample.
  return (le / n) * 100;
}

function readinessTierFromIomHealthTier(iomHealthTier: string | null): SystemHealthTier {
  if (!iomHealthTier) return "unknown";
  if (iomHealthTier === "critical") return "blocked";
  if (iomHealthTier === "watch") return "needs_review";
  if (iomHealthTier === "green") return "ready";
  return "unknown";
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function getSystemHealthMetricFromArtifacts(repoRoot: string): SystemHealthMetric {
  const base: SystemHealthMetric = {
    engineReadinessPercentile: null,
    engineWorthScore: null,
    engineWorthUnit: null,
    receiptsUsed: 0,
    readinessTier: "unknown",
    readinessExplainer: "No local verify receipts found on disk — compute readiness unavailable.",
    iomJudgment: {
      iomCoverageScore: null,
      iomHealthTier: null,
      iomHealthVerdict: null,
      iomActiveSchisms: null,
      iomSchismCodes: [],
    },
  };

  const verifyDir = path.join(repoRoot, "artifacts", "verify");
  if (!fs.existsSync(verifyDir)) return base;

  const latestPath = path.join(verifyDir, "verify-receipt-latest.json");
  const latestRaw = fs.existsSync(latestPath) ? fs.readFileSync(latestPath, "utf8") : null;
  const latest = latestRaw ? safeJsonParse<any>(latestRaw) : null;

  const iomHealthTier = typeof latest?.iomHealthTier === "string" ? latest.iomHealthTier : null;
  const iomHealthVerdict = typeof latest?.iomHealthVerdict === "string" ? latest.iomHealthVerdict : null;
  const iomCoverageScore = isFiniteNumber(latest?.iomCoverageScore) ? latest.iomCoverageScore : null;
  const iomActiveSchisms = isFiniteNumber(latest?.iomActiveSchisms) ? latest.iomActiveSchisms : null;
  const iomSchismCodes = Array.isArray(latest?.iomSchismCodes)
    ? (latest.iomSchismCodes.filter((x: unknown) => typeof x === "string") as string[])
    : [];

  base.iomJudgment = {
    iomCoverageScore,
    iomHealthTier,
    iomHealthVerdict,
    iomActiveSchisms,
    iomSchismCodes,
  };
  base.readinessTier = readinessTierFromIomHealthTier(iomHealthTier);

  const engineWorthScore = isFiniteNumber(latest?.engineWorth?.score) ? latest.engineWorth.score : null;
  const engineWorthUnit = typeof latest?.engineWorth?.unit === "string" ? latest.engineWorth.unit : null;
  base.engineWorthScore = engineWorthScore;
  base.engineWorthUnit = engineWorthUnit;

  const allFiles = fs.readdirSync(verifyDir).filter((f) => /^verify-receipt-.*\.json$/.test(f));
  const scores: number[] = [];
  for (const f of allFiles) {
    const p = path.join(verifyDir, f);
    const raw = fs.readFileSync(p, "utf8");
    const parsed = safeJsonParse<any>(raw);
    const s = parsed?.engineWorth?.score;
    if (isFiniteNumber(s)) scores.push(s);
  }

  base.receiptsUsed = scores.length;
  if (engineWorthScore != null && scores.length > 0) {
    base.engineReadinessPercentile = computePercentileFromScores(scores, engineWorthScore);
  }

  const tierExplain =
    base.readinessTier === "ready"
      ? "IOM tier: GREEN (no critical/warn schisms)."
      : base.readinessTier === "needs_review"
        ? "IOM tier: WATCH (review warn/info schisms and coverage)."
        : base.readinessTier === "blocked"
          ? "IOM tier: CRITICAL (triage before ship)."
          : "IOM tier unavailable — check `artifacts/verify/verify-receipt-latest.json`.";

  const schismExplain =
    iomSchismCodes.length > 0
      ? `IOM schisms: ${iomSchismCodes.join(", ")}.`
      : "IOM schisms: (none in latest receipt).";

  const covExplain =
    iomCoverageScore != null ? `IOM coverage: ${iomCoverageScore.toFixed(2)}.` : "IOM coverage: unavailable.";

  const readinessExplain =
    base.engineReadinessPercentile != null
      ? `Engine readiness percentile: ${base.engineReadinessPercentile.toFixed(2)}th (local receipts sample).`
      : "Engine readiness percentile: unavailable (insufficient receipts or missing engineWorth score).";

  base.readinessExplainer = `${tierExplain} ${covExplain} ${schismExplain} ${readinessExplain}`;
  return base;
}

