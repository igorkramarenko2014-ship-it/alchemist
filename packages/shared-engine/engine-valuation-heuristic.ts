/**
 * Replacement-cost heuristic for **operator / audit context** — fuses with IOM offline snapshots.
 *
 * **Philosophy:** Same transparency posture as IOM — explicit numbers, provenance, no hidden
 * “oracle.” This is **not** professional M&A valuation, **not** legal/financial advice, and **not**
 * an input to triad weights, gates, or routes.
 */
export const ENGINE_VALUATION_HEURISTIC_VERSION = 1 as const;

/** LOC scan of `packages/shared-engine` + `packages/fxp-encoder` (caller supplies via FS walk). */
export interface EnginePackageMetrics {
  totalLines: number;
  totalFiles: number;
  linesTest: number;
  linesGen: number;
  linesSrc: number;
  testFileCount: number;
  byPackage: {
    sharedEngine: PackageLocBreakdown;
    fxpEncoder: PackageLocBreakdown;
  };
}

export interface PackageLocBreakdown {
  files: number;
  lines: number;
  linesTest: number;
  linesGen: number;
  linesSrc: number;
}

export interface EngineValuationHeuristicResult {
  heuristicVersion: typeof ENGINE_VALUATION_HEURISTIC_VERSION;
  /** Single-sentence IOM-aligned disclaimer. */
  philosophyNote: string;
  metrics: {
    totalLines: number;
    totalFiles: number;
    testFileCount: number;
    linesTest: number;
    linesSrc: number;
  };
  /** Mid assumption: 80 effective LOC/day (design + review + tests). */
  personDaysMid: number;
  personDaysBand: readonly [number, number];
  engMonthsMid: number;
  engMonthsBand: readonly [number, number];
  /** Fully loaded cost mid ($25k/mo × engMonthsMid). */
  replacementCostUsdMid: number;
  replacementCostUsdBand: readonly [number, number];
  nonExclusiveLicenseYear1UsdBand: readonly [number, number];
  nonExclusiveLicenseYear1UsdMid: number;
  exclusiveAssetUsdBand: readonly [number, number];
  /** Paste-friendly line for logs / Markdown. */
  operatorLine: string;
}

const PHILOSOPHY_NOTE =
  "Replacement-cost heuristic only — descriptive market context for operators; not professional valuation and not a gate or triad input.";

const LOC_PER_DAY_LO = 40;
const LOC_PER_DAY_HI = 120;
const LOC_PER_DAY_MID = 80;
const DAYS_PER_MONTH = 21;
const COST_MO_LO = 18_000;
const COST_MO_MID = 25_000;
const COST_MO_HI = 35_000;
const LICENSE_PCT_LO = 0.15;
const LICENSE_PCT_HI = 0.4;
const LICENSE_PCT_MID = 0.25;

function roundUsd(n: number): number {
  return Math.round(n);
}

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(roundUsd(n));
}

/**
 * Deterministic bands from scanned LOC — mirrors `pnpm estimate` / `scripts/engine-estimate.ts`.
 */
export function computeEngineValuationHeuristic(m: EnginePackageMetrics): EngineValuationHeuristicResult {
  const { totalLines, totalFiles, testFileCount, linesTest, linesSrc } = m;
  const daysLo = totalLines / LOC_PER_DAY_HI;
  const daysHi = totalLines / LOC_PER_DAY_LO;
  const daysMid = totalLines / LOC_PER_DAY_MID;
  const monthsLo = daysLo / DAYS_PER_MONTH;
  const monthsHi = daysHi / DAYS_PER_MONTH;
  const monthsMid = daysMid / DAYS_PER_MONTH;

  const replaceLo = monthsLo * COST_MO_LO;
  const replaceMid = monthsMid * COST_MO_MID;
  const replaceHi = monthsHi * COST_MO_HI;

  const licenseY1Lo = replaceMid * LICENSE_PCT_LO;
  const licenseY1Hi = replaceMid * LICENSE_PCT_HI;
  const licenseY1Mid = replaceMid * LICENSE_PCT_MID;

  const exclusiveLo = replaceMid * 1;
  const exclusiveHi = replaceMid * 3;

  const operatorLine = `Engine scale: ${totalLines} LOC / ${totalFiles} files / ${testFileCount} Vitest files → replacement heuristic mid ${fmtUsd(replaceMid)} (${fmtUsd(replaceLo)}–${fmtUsd(replaceHi)}); non-exclusive Y1 anchor ~${fmtUsd(licenseY1Lo)}–${fmtUsd(licenseY1Hi)} — ${PHILOSOPHY_NOTE}`;

  return {
    heuristicVersion: ENGINE_VALUATION_HEURISTIC_VERSION,
    philosophyNote: PHILOSOPHY_NOTE,
    metrics: { totalLines, totalFiles, testFileCount, linesTest, linesSrc },
    personDaysMid: daysMid,
    personDaysBand: [daysLo, daysHi] as const,
    engMonthsMid: monthsMid,
    engMonthsBand: [monthsLo, monthsHi] as const,
    replacementCostUsdMid: roundUsd(replaceMid),
    replacementCostUsdBand: [roundUsd(replaceLo), roundUsd(replaceHi)] as const,
    nonExclusiveLicenseYear1UsdBand: [roundUsd(licenseY1Lo), roundUsd(licenseY1Hi)] as const,
    nonExclusiveLicenseYear1UsdMid: roundUsd(licenseY1Mid),
    exclusiveAssetUsdBand: [roundUsd(exclusiveLo), roundUsd(exclusiveHi)] as const,
    operatorLine,
  };
}
