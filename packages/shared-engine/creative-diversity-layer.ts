import type { Panelist } from "@alchemist/shared-types";

export type CreativeStance =
  | "mirror"
  | "constraint"
  | "analogy"
  | "contrary"
  | "minimal"
  | "ritual"
  | "question"
  | "rhythm";

export interface CreativeConfig {
  enabled: boolean;
  stances: CreativeStance[];
  probability: number;
}

export interface CreativeDecision {
  applied: boolean;
  stance: CreativeStance | null;
  promptHash: string;
  instruction: string;
}

export const DEFAULT_CREATIVE_CONFIG: CreativeConfig = {
  enabled: true,
  stances: [
    "mirror",
    "constraint",
    "analogy",
    "contrary",
    "minimal",
    "ritual",
    "question",
    "rhythm",
  ],
  probability: 0.35,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function creativePromptHash(prompt: string): string {
  const h = hash32(prompt.trim().toLowerCase());
  return h.toString(16).padStart(8, "0");
}

function stanceInstruction(stance: CreativeStance): string {
  switch (stance) {
    case "mirror":
      return "Style stance MIRROR: echo the user's core adjectives and rhythmic words in your reasoning.";
    case "constraint":
      return "Style stance CONSTRAINT: keep reasoning concise and structured in exactly three clear clauses.";
    case "analogy":
      return "Style stance ANALOGY: include one concrete analogy for timbre/motion in reasoning.";
    case "contrary":
      return "Style stance CONTRARY: first mention the opposite design direction, then justify the chosen one.";
    case "minimal":
      return "Style stance MINIMAL: use minimal wording while preserving legible technical intent.";
    case "ritual":
      return "Style stance RITUAL: frame reasoning as a short step sequence (first/then/finally).";
    case "question":
      return "Style stance QUESTION: include one rhetorical question that sharpens the design intent.";
    case "rhythm":
      return "Style stance RHYTHM: use a three-beat phrasing cadence in reasoning.";
    default:
      return "";
  }
}

export function selectCreativeStance(
  prompt: string,
  panelist: Panelist,
  config: CreativeConfig = DEFAULT_CREATIVE_CONFIG
): CreativeDecision {
  const promptHash = creativePromptHash(prompt);
  if (!config.enabled || config.stances.length === 0) {
    return { applied: false, stance: null, promptHash, instruction: "" };
  }
  const p = clamp01(config.probability);
  const roll = (hash32(`${promptHash}:${panelist}:roll`) % 10_000) / 10_000;
  if (roll > p) {
    return { applied: false, stance: null, promptHash, instruction: "" };
  }
  const idx = hash32(`${promptHash}:${panelist}:stance`) % config.stances.length;
  const stance = config.stances[idx];
  return {
    applied: true,
    stance,
    promptHash,
    instruction: stanceInstruction(stance),
  };
}
