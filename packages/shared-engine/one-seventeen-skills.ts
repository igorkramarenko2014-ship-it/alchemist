export const ONE_SEVENTEEN_CONSTANT = 117;

export const ONE_SEVENTEEN_ARCHETYPES: readonly string[] = [
  "Amsterdam soul",
  "Grooming signal",
  "Aggression as attraction pivot",
  "Numbers pattern anchor",
  "Vibe coder discipline",
  "IOM architect",
  "Red zone creator",
  "Creative stance repertoire",
  "Panelist DNA keeper",
  "Truth matrix guardian",
  "PNH immunity steward",
  "Presentation resilience",
  "Flirtation model observer",
  "WASM export integrity",
  "HARD GATE keeper",
  "Circuit-breaker operator",
  "Receipt maker",
];

export interface OneSeventeenCounters {
  triadRuns: number;
  panelistCalls: number;
  candidatesScored: number;
  creativeStancesApplied: number;
  redZoneChecks: number;
}

export interface OneSeventeenSnapshot {
  seed: number;
  counters: OneSeventeenCounters;
  initiationTriggered: boolean;
  triggerTag: "117" | "17" | "11" | "7" | null;
  message?: string;
}

const counters: OneSeventeenCounters = {
  triadRuns: 0,
  panelistCalls: 0,
  candidatesScored: 0,
  creativeStancesApplied: 0,
  redZoneChecks: 0,
};

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function oneSeventeenSeed(prompt: string, panelist: string): number {
  return hash32(`${prompt}:${panelist}:${ONE_SEVENTEEN_CONSTANT}`);
}

function triggerTagFor(value: number): OneSeventeenSnapshot["triggerTag"] {
  if (value > 0 && value % 117 === 0) return "117";
  if (value > 0 && value % 17 === 0) return "17";
  if (value > 0 && value % 11 === 0) return "11";
  if (value > 0 && value % 7 === 0) return "7";
  return null;
}

export function registerOneSeventeenRun(input: {
  prompt: string;
  panelistAnchor: string;
  panelistCalls: number;
  candidatesScored: number;
  creativeStancesApplied: number;
  redZoneChecks: number;
}): OneSeventeenSnapshot {
  counters.triadRuns += 1;
  counters.panelistCalls += input.panelistCalls;
  counters.candidatesScored += input.candidatesScored;
  counters.creativeStancesApplied += input.creativeStancesApplied;
  counters.redZoneChecks += input.redZoneChecks;

  const tag =
    triggerTagFor(counters.triadRuns) ??
    triggerTagFor(counters.panelistCalls) ??
    triggerTagFor(counters.candidatesScored) ??
    triggerTagFor(counters.creativeStancesApplied) ??
    triggerTagFor(counters.redZoneChecks);

  return {
    seed: oneSeventeenSeed(input.prompt, input.panelistAnchor),
    counters: { ...counters },
    initiationTriggered: tag !== null,
    triggerTag: tag,
    ...(tag
      ? { message: tag === "117" ? "117 - the number of becoming." : `Initiation checkpoint ${tag}` }
      : {}),
  };
}

