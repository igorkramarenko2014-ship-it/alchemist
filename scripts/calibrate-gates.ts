/**
 * Observation-only gate calibration: hits live triad routes when BASE_URL matches the dev banner
 * (e.g. http://127.0.0.1:3002). Does not change thresholds.
 *
 * Env:
 * - BASE_URL — default http://127.0.0.1:3000 (set to your cyan banner port)
 * - CALIBRATION_PROMPTS_FILE — optional; one prompt per line (replaces embedded set)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AICandidate, Panelist } from "@alchemist/shared-engine";
import {
  AI_TIMEOUT_MS,
  candidatePassesAdversarial,
  candidatePassesDistributionGate,
  computeSoeRecommendations,
  entropyParamArray,
  filterValid,
  getIOMHealthPulse,
  isValidCandidate,
  logEvent,
  logSoeHintWithIomContext,
  makeTriadFetcher,
  newTriadRunId,
  slavicFilterDedupe,
  TRIAD_PANELISTS,
  validatePromptForTriad,
} from "@alchemist/shared-engine";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = join(rootDir, "tools", "gate-calibration-output.json");

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";

const EMBEDDED_PROMPTS: string[] = [
  "Aggressive reese bass with sidechain pump for techno",
  "Bright supersaw lead with slow attack for trance",
  "Warm analog pad with long release and subtle movement",
  "Short plucky keys with metallic transient",
  "Glitchy FX texture with granular feel",
  "Dark ambient drone with filtered noise bed",
  "808 sub bass with click and short decay",
  "Screaming lead with filter resonance sweep",
  "Lo-fi dusty pad with vinyl noise character",
  "Metallic pluck with pitch envelope down",
  "Wide stereo pad with chorus and shimmer",
  "Minimal techno bass one-note groove",
  "Ethereal vocal pad without formants",
  "Percussive pluck sequence for house",
  "Cinematic riser FX into silence",
  "Sub bass with harmonic saturation only",
  "Bell-like lead with long decay tail",
  "Atmospheric pad with slow LFO filter",
  "Acid line with resonant filter envelope",
  "Bright keys stab with short reverb",
  "Deep dubstep wobble bass",
  "Soft evolving texture for underscore",
  "Sharp attack pluck for future bass",
  "Noise sweep FX for transitions",
  "Warm brass pad layered with strings",
  "Glassy digital lead with delay throws",
  "Organic ambient bed with field recording vibe",
  "Club kick layered sub and mid punch",
];

function loadPrompts(): string[] {
  const path = process.env.CALIBRATION_PROMPTS_FILE?.trim();
  if (path) {
    const raw = readFileSync(path, "utf8");
    return raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }
  return EMBEDDED_PROMPTS;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

async function fetchPanelistMerged(
  fetcher: ReturnType<typeof makeTriadFetcher>,
  prompt: string,
  panelist: Panelist
): Promise<{ value: AICandidate[]; failed: boolean }> {
  const controller = new AbortController();
  try {
    const value = await withTimeout(
      fetcher(prompt, panelist, controller.signal),
      AI_TIMEOUT_MS
    );
    const failed = value.length === 0;
    return { value, failed };
  } catch {
    return { value: [], failed: true };
  }
}

type PanelistFailureCounts = Record<Panelist, { failures: number; calls: number }>;

function emptyPanelistCounts(): PanelistFailureCounts {
  return {
    LLAMA: { failures: 0, calls: 0 },
    DEEPSEEK: { failures: 0, calls: 0 },
    QWEN: { failures: 0, calls: 0 },
  };
}

async function main(): Promise<void> {
  const baseUrl = (process.env.BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const prompts = loadPrompts();
  const validPrompts: string[] = [];
  for (const prompt of prompts) {
    const pg = validatePromptForTriad(prompt);
    if (pg.ok === false) {
      console.error(`[calibrate-gates] skip invalid prompt: ${pg.reason}`);
      continue;
    }
    validPrompts.push(prompt);
  }

  const runId = newTriadRunId();

  logEvent("calibration_start", {
    runId,
    promptCount: validPrompts.length,
    baseUrl,
  });

  const fetcher = makeTriadFetcher(false, baseUrl);
  const panelistFailures = emptyPanelistCounts();

  let totalRawCandidates = 0;
  let passValid = 0;
  let passDistribution = 0;
  let passAdversarial = 0;
  const reasoningLens: number[] = [];
  let under20 = 0;
  const paramMeans: number[] = [];
  const entropies: number[] = [];
  const promptDurationsMs: number[] = [];
  let slavicValidIn = 0;
  let slavicAfter = 0;

  const t0All = Date.now();

  for (const prompt of validPrompts) {
    const t0 = Date.now();
    const chunks = await Promise.all(
      TRIAD_PANELISTS.map(async (panelist) => {
        panelistFailures[panelist].calls += 1;
        const { value, failed } = await fetchPanelistMerged(fetcher, prompt, panelist);
        if (failed) panelistFailures[panelist].failures += 1;
        return value;
      })
    );
    const rawCandidates = chunks.flat() as AICandidate[];
    promptDurationsMs.push(Date.now() - t0);

    const validForSlavic = filterValid(rawCandidates);
    const afterSlavic = slavicFilterDedupe(validForSlavic);
    slavicValidIn += validForSlavic.length;
    slavicAfter += afterSlavic.length;

    for (const c of rawCandidates) {
      totalRawCandidates += 1;
      const r = typeof c.reasoning === "string" ? c.reasoning.trim() : "";
      reasoningLens.push(r.length);
      if (r.length < 20) under20 += 1;

      if (isValidCandidate(c)) passValid += 1;
      if (candidatePassesDistributionGate(c)) passDistribution += 1;
      if (candidatePassesAdversarial(c, prompt)) passAdversarial += 1;

      const pa = c.paramArray;
      if (pa != null && Array.isArray(pa) && pa.length > 0) {
        const m = pa.reduce((s, v) => s + v, 0) / pa.length;
        paramMeans.push(m);
        entropies.push(entropyParamArray(pa));
      }
    }
  }

  const total = Math.max(totalRawCandidates, 1);
  const survivalRates = {
    isValid: passValid / total,
    distribution: passDistribution / total,
    adversarial: passAdversarial / total,
  };

  const entMin = entropies.length ? Math.min(...entropies) : null;
  const entMax = entropies.length ? Math.max(...entropies) : null;
  const meanOfMeans = mean(paramMeans);

  const providerFailureRate = {
    DEEPSEEK:
      panelistFailures.DEEPSEEK.calls > 0
        ? panelistFailures.DEEPSEEK.failures / panelistFailures.DEEPSEEK.calls
        : 0,
    LLAMA:
      panelistFailures.LLAMA.calls > 0
        ? panelistFailures.LLAMA.failures / panelistFailures.LLAMA.calls
        : 0,
    QWEN:
      panelistFailures.QWEN.calls > 0
        ? panelistFailures.QWEN.failures / panelistFailures.QWEN.calls
        : 0,
  };

  const runDurationMs = {
    mean: mean(promptDurationsMs) ?? 0,
    max: promptDurationsMs.length ? Math.max(...promptDurationsMs) : 0,
    total: Date.now() - t0All,
  };

  const output = {
    runId,
    totalPrompts: validPrompts.length,
    totalRawCandidates,
    survivalRates,
    paramStats: {
      meanOfMeans,
      entropyMin: entMin,
      entropyMax: entMax,
    },
    reasoningLengths: {
      min: reasoningLens.length ? Math.min(...reasoningLens) : 0,
      max: reasoningLens.length ? Math.max(...reasoningLens) : 0,
      median: median(reasoningLens),
      pctUnder20: totalRawCandidates > 0 ? under20 / totalRawCandidates : 0,
    },
    providerFailureRate,
    runDurationMs,
  };

  mkdirSync(join(rootDir, "tools"), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  logEvent("calibration_complete", {
    runId,
    totalPrompts: output.totalPrompts,
    totalRawCandidates: output.totalRawCandidates,
    survivalRates: output.survivalRates,
    slavicDedupe: {
      validCandidatesIn: slavicValidIn,
      uniqueAfterDedupe: slavicAfter,
    },
    runDurationMs: output.runDurationMs,
    outputPath: OUTPUT_PATH,
  });

  const meanProviderFailure =
    (providerFailureRate.DEEPSEEK + providerFailureRate.LLAMA + providerFailureRate.QWEN) / 3;
  const gateDropApprox =
    slavicValidIn > 0 ? Math.min(1, Math.max(0, 1 - slavicAfter / slavicValidIn)) : 0;
  const iomPulse = getIOMHealthPulse({
    soeSnapshot: {
      meanPanelistMs: output.runDurationMs.mean,
      triadFailureRate: meanProviderFailure,
      gateDropRate: gateDropApprox,
    },
  });
  logEvent("iom_soe_fusion", {
    phase: "calibration_complete",
    runId,
    iomSchismCodes: iomPulse.schisms.map((s) => s.code),
    iomFusionHintCodes: iomPulse.soe?.fusionHintCodes ?? [],
    iomPulseVersion: iomPulse.pulseVersion,
    calibrationGateDropApprox: gateDropApprox,
    calibrationMeanProviderFailure: meanProviderFailure,
    note:
      "Calibration-derived SOE snapshot run through IOM pulse for schism context — offline diagnostic only.",
  });

  const soeForIomLog = computeSoeRecommendations(
    {
      meanPanelistMs: output.runDurationMs.mean,
      triadFailureRate: meanProviderFailure,
      gateDropRate: gateDropApprox,
    },
    { iomSchismCodes: iomPulse.schisms.map((s) => s.code) },
  );
  logSoeHintWithIomContext(soeForIomLog, { runId, phase: "calibration_complete" });

  console.error(`[calibrate-gates] wrote ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
