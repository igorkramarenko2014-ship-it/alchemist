export const ONE_SEVENTEEN_CONSTANT = 117;

export interface OneSeventeenSkill {
  id: string;
  fact: string;
  name: string;
  trigger: string;
  boundedEffect: string;
  auditField: string;
}

export const ONE_SEVENTEEN_SKILLS: readonly OneSeventeenSkill[] = [
  { id: "s01", fact: "Mom memory 20.12.25", name: "In Memoriam Flag", trigger: "run_of_month%20===0 || date==20/12", boundedEffect: "receipt honor tag only", auditField: "honor" },
  { id: "s02", fact: "Love and miss mom", name: "Tribute Stance", trigger: "prompt has love|miss", boundedEffect: "optional warm line", auditField: "tribute" },
  { id: "s03", fact: "Kharkiv + Amsterdam", name: "Dual-City Seed", trigger: "always", boundedEffect: "seed salt KharkivAmsterdam", auditField: "dualCitySeed" },
  { id: "s04", fact: "Alpaka + Lion", name: "Totemic Modes", trigger: "aggression detection", boundedEffect: "stance tag alpaka|lion", auditField: "totem" },
  { id: "s05", fact: "Liverpool fan", name: "Anfield Resonance", trigger: "high engagement", boundedEffect: "optional style nod", auditField: "anfield" },
  { id: "s06", fact: "YNWA", name: "YNWA Pledge", trigger: "always", boundedEffect: "spirit marker only", auditField: "spirit" },
  { id: "s07", fact: "Istanbul final", name: "Miracle Stance", trigger: "high confidence and low-probability gate", boundedEffect: "rare stance", auditField: "miracle" },
  { id: "s08", fact: "Color blue", name: "Blue Filter", trigger: "ui rendering", boundedEffect: "optional accent", auditField: "blue" },
  { id: "s09", fact: "World-class musician", name: "Rhythm Stance", trigger: "stance selection", boundedEffect: "language modifier", auditField: "rhythm" },
  { id: "s10", fact: "Portrait artist", name: "Portrait Mode", trigger: "creative lane", boundedEffect: "descriptive prompt line", auditField: "portrait" },
  { id: "s11", fact: "Music addict", name: "Playlist Resonance", trigger: "playlist enabled", boundedEffect: "style references only", auditField: "playlist_reference" },
  { id: "s12", fact: "Rap/Rock/DnB", name: "Genre Seeds", trigger: "deterministic seed", boundedEffect: "genre phrasing modifier", auditField: "genreSeed" },
  { id: "s13", fact: "I attract", name: "Attraction Principle", trigger: "engagement threshold", boundedEffect: "never force grooming", auditField: "attractionPrinciple" },
  { id: "s14", fact: "Yogin", name: "Yogic Calm", trigger: "aggressive prompt", boundedEffect: "inject one grounded candidate path", auditField: "yogic" },
  { id: "s15", fact: "17 sadhu pushups", name: "The 17 Test", trigger: "candidate_count%17===0", boundedEffect: "strength proven tag", auditField: "strength" },
  { id: "s16", fact: "Cycling addict", name: "Endurance Mode", trigger: "long session >10 prompts", boundedEffect: "receipt hint", auditField: "endurance" },
  { id: "s17", fact: "10k in 40 min", name: "Runner's Pace", trigger: "always", boundedEffect: "pace marker only", auditField: "pace" },
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
  oneSeventeen: {
    skillsLoaded: number;
    initiationTriggered: boolean;
    lastTrigger: string | null;
    spirit: "YNWA";
    pace: "elite";
    strength?: "proven";
    honor?: "mom";
  };
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
  return hash32(`${prompt}:${panelist}:KharkivAmsterdam:${ONE_SEVENTEEN_CONSTANT}`);
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
  const now = new Date();
  const honorMom =
    now.getUTCDate() === 20 && now.getUTCMonth() + 1 === 12
      ? true
      : counters.triadRuns % 20 === 0;
  const strength = counters.candidatesScored > 0 && counters.candidatesScored % 17 === 0;

  return {
    seed: oneSeventeenSeed(input.prompt, input.panelistAnchor),
    counters: { ...counters },
    initiationTriggered: tag !== null,
    triggerTag: tag,
    ...(tag
      ? { message: tag === "117" ? "117 - the number of becoming." : `Initiation checkpoint ${tag}` }
      : {}),
    oneSeventeen: {
      skillsLoaded: ONE_SEVENTEEN_SKILLS.length,
      initiationTriggered: tag !== null,
      lastTrigger: tag === "117" ? "initiation" : tag,
      spirit: "YNWA",
      pace: "elite",
      ...(strength ? { strength: "proven" as const } : {}),
      ...(honorMom ? { honor: "mom" as const } : {}),
    },
  };
}

