import type { AICandidate, Panelist } from "@alchemist/shared-types";

const RECENT_DROP_WINDOW = 12;
const DEFAULT_DROP_TRIGGER = 0.4;

let previousTopCandidate: AICandidate | null = null;
const recentGateDropRates: number[] = [];

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function __resetTriadConstraintInjectionStateForTests(): void {
  previousTopCandidate = null;
  recentGateDropRates.length = 0;
}

export function recordTriadConstraintFeedback(
  topCandidate: AICandidate | null,
  gateDropRate: number
): void {
  if (topCandidate) previousTopCandidate = topCandidate;
  recentGateDropRates.push(clamp01(gateDropRate));
  if (recentGateDropRates.length > RECENT_DROP_WINDOW) {
    recentGateDropRates.splice(0, recentGateDropRates.length - RECENT_DROP_WINDOW);
  }
}

export function getRecentSlavicDropRate(): number {
  if (recentGateDropRates.length === 0) return 0;
  return recentGateDropRates.reduce((a, b) => a + b, 0) / recentGateDropRates.length;
}

export function inferDominantCharacteristic(candidate: AICandidate): string {
  const reasoning = candidate.reasoning?.toLowerCase() ?? "";
  if (reasoning.includes("harmonic") || reasoning.includes("stacking")) {
    return "used rich harmonic stacking and detuned unison";
  }
  if (reasoning.includes("lfo") || reasoning.includes("modulation")) {
    return "used aggressive LFO modulation and movement";
  }
  if (reasoning.includes("texture") || reasoning.includes("saturation")) {
    return "used timbral texture and saturation layers";
  }
  const arr = candidate.paramArray;
  if (!Array.isArray(arr) || arr.length === 0) return "occupied a narrow timbral region";
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return mean > 0.6
    ? "had high-value parameter density (bright/loud)"
    : "had low-value parameter density (dark/quiet)";
}

export function buildContrastConstraint(previous: AICandidate | null): string {
  if (!previous) return "";
  const dominant = inferDominantCharacteristic(previous);
  return [
    "CONSTRAINT: Your output must be structurally different from the previous top candidate.",
    `Avoid presets that ${dominant}.`,
    "If prior output was harmonic, bias movement/rhythm.",
    "If prior output was movement-heavy, bias spectral texture/body.",
    "Explore the opposite end of the viable parameter space while staying in-range [0,1].",
  ].join(" ");
}

export function buildTriadPromptWithContrastConstraint(
  prompt: string,
  panelist: Panelist,
  options?: { enabled?: boolean; dropTrigger?: number }
): { prompt: string; applied: boolean; dropRate: number } {
  const enabled = options?.enabled !== false;
  const dropRate = getRecentSlavicDropRate();
  const trigger = options?.dropTrigger ?? DEFAULT_DROP_TRIGGER;
  if (!enabled || dropRate <= trigger) {
    return { prompt, applied: false, dropRate };
  }
  const contrast = buildContrastConstraint(previousTopCandidate);
  if (!contrast) {
    return { prompt, applied: false, dropRate };
  }
  const lane = panelist === "DEEPSEEK" ? "harmonic_architecture" : panelist === "LLAMA" ? "rhythmic_motion" : "timbral_texture";
  return {
    prompt: `${prompt}\n\n[AIOM_CONTRAST_CONSTRAINT lane=${lane}] ${contrast}`,
    applied: true,
    dropRate,
  };
}
