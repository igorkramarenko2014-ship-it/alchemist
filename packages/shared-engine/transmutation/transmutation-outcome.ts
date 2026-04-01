import type { AICandidate, TransmutationTaskType, TransmutationMood } from "@alchemist/shared-types";
import type { TaskSchema } from "./transmutation-types";
import { interpretTask } from "./task-interpreter";

/**
 * Task Family Mapping — avoids brittle binary matches for near-neighbors.
 */
const TASK_FAMILY_MAP: Record<TransmutationTaskType, string> = {
  bass: "BASS",
  pluck: "LEAD_PLUCK",
  lead: "LEAD_PLUCK",
  pad: "ATMOS",
  texture: "ATMOS",
  noise: "ATMOS",
  fx: "FX",
  riser: "FX",
  unknown: "UNKNOWN",
};

/**
 * MOOD_MAP clone for candidate-side normalization (duplicated to avoid circular deps if needed).
 */
const MOOD_NORM_MAP: Record<string, TransmutationMood> = {
  dark: "dark",
  bright: "bright",
  warm: "warm",
  metallic: "metallic",
  aggressive: "aggressive",
  hard: "aggressive",
  soft: "soft",
  gentle: "soft",
  gritty: "gritty",
  dirty: "gritty",
  clean: "clean",
};

export interface AlignmentBreakdown {
  task_type: number;
  mood: number;
  mix_role: number;
  novelty: number;
}

export interface AlignmentScore {
  final: number;
  confidence: number;
  breakdown: AlignmentBreakdown;
}

/**
 * Normalizes candidate text into a set of identified moods using the MOOD_MAP.
 */
function extractMoodsFromText(text: string): Set<TransmutationMood> {
  const p = text.toLowerCase();
  const out = new Set<TransmutationMood>();
  for (const [kw, mood] of Object.entries(MOOD_NORM_MAP)) {
    if (p.includes(kw)) {
      out.add(mood);
    }
  }
  return out;
}

function calculateJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0.55; 
  if (a.size === 0 || b.size === 0) return 0.25;
  let inter = 0;
  a.forEach(x => { if (b.has(x)) inter++; });
  const union = a.size + b.size - inter;
  return inter / union;
}

/**
 * MOVE 3 — Intent Alignment Score calculation.
 * Observational-only signal.
 */
export function computeOutcomeAlignment(
  schema: TaskSchema,
  candidate: AICandidate,
  options?: { survivorMeanNovelty?: number }
): AlignmentScore {
  const candText = `${candidate.description ?? ""} ${candidate.reasoning ?? ""}`.toLowerCase();
  
  // 1. Task Type Alignment (40%) - Fuzzy Family
  let taskScore = 0;
  const candTask = interpretTask(candText).task_type;
  if (candTask === schema.task_type && schema.task_type !== "unknown") {
    taskScore = 1.0;
  } else if (TASK_FAMILY_MAP[candTask] === TASK_FAMILY_MAP[schema.task_type] && schema.task_type !== "unknown") {
    taskScore = 0.75;
  } else if (schema.task_type === "unknown") {
    taskScore = 0.5;
  }

  // 2. Mood Alignment (35%) - Schema-to-Schema
  const candMoods = extractMoodsFromText(candText);
  const targetMoods = new Set(schema.target_mood);
  const moodScore = calculateJaccard(targetMoods, candMoods);

  // 3. Mix Role Alignment (10%)
  let mixScore = 0.5; // neutral
  const mixKeywords = {
    sub: ["sub", "bottom", "low"],
    main: ["main", "primary", "center"],
    top: ["top", "high", "lead"],
    layer: ["layer", "background", "texture"]
  };
  // Future: schema.mix_role comparison; for now, simple text check
  const hasMixKeyword = Object.values(mixKeywords).flat().some(kw => candText.includes(kw));
  if (hasMixKeyword) mixScore = 0.8;

  // 4. Novelty Alignment (5%)
  let noveltyScore = 0.5;
  if (options?.survivorMeanNovelty != null) {
    // Distance from mean vs requested novelty preference
    const requested = schema.novelty_preference ?? 0.5;
    const actual = options.survivorMeanNovelty; 
    noveltyScore = 1 - Math.abs(requested - actual);
  }

  // 5. Confidence Calculation (10% of final, but additive weight)
  const taskClarity = schema.confidence;
  const reasoningDensity = Math.min(1.0, candText.trim().length / 200); 
  const alignmentConfidence = (taskClarity * 0.6) + (reasoningDensity * 0.4);

  const breakdown: AlignmentBreakdown = {
    task_type: taskScore,
    mood: moodScore,
    mix_role: mixScore,
    novelty: noveltyScore
  };

  const final = (
    (breakdown.task_type * 0.40) +
    (breakdown.mood * 0.35) +
    (breakdown.mix_role * 0.10) +
    (breakdown.novelty * 0.05) +
    (alignmentConfidence * 0.10)
  );

  return {
    final,
    confidence: alignmentConfidence,
    breakdown
  };
}
