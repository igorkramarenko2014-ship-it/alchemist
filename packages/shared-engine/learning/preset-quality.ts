import type { AICandidate, Panelist } from "@alchemist/shared-types";
import { scoreCandidates } from "../score";
import {
  computeCorpusAffinity,
  type LearningIndexLesson,
} from "./compute-corpus-affinity";

export interface PresetQualityCase {
  promptId: string;
  prompt: string;
  candidates: AICandidate[];
  learningLessons: LearningIndexLesson[];
  corpusAffinityWeight?: number;
}

export interface PresetQualityComparison {
  promptId: string;
  prompt: string;
  corpusAffinityWeight: number;
  scoreWithoutPriors: number;
  scoreWithPriors: number;
  rawTopScoreWithoutPriors: number;
  rawTopScoreWithPriors: number;
  topAffinityWithoutPriors: number;
  topAffinityWithPriors: number;
  survivorsWithoutPriors: number;
  survivorsWithPriors: number;
  deltaScore: number;
  deltaRawTopScore: number;
  deltaSurvivors: number;
  selectedPanelistWithoutPriors: Panelist | null;
  selectedPanelistWithPriors: Panelist | null;
  orderingChanged: boolean;
  nonRegression: boolean;
  improved: boolean;
}

export interface PresetQualityReportSummary {
  meanDeltaScore: number;
  meanRawTopScoreDelta: number;
  meanSurvivorDelta: number;
  nonRegressionRate: number;
  improvedRate: number;
  selectionChangeRate: number;
}

export interface PresetQualityReport {
  schemaVersion: 1;
  generatedAtUtc: string;
  qualityMetric: "topSelectedScorePlusCorpusAffinity";
  promptCount: number;
  rawScoreNonRegressionFloor: number;
  comparisons: PresetQualityComparison[];
  summary: PresetQualityReportSummary;
}

function round4(value: number): number {
  return Number(value.toFixed(4));
}

function mkState(overrides?: Record<string, unknown>): AICandidate["state"] {
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
    ...overrides,
  } as AICandidate["state"];
}

function mkCandidate(
  panelist: Panelist,
  score: number,
  reasoning: string,
  description: string,
  state: AICandidate["state"],
): AICandidate {
  return {
    panelist,
    score,
    reasoning,
    description,
    state,
  };
}

function selectedQualityScore(
  candidate: AICandidate | undefined,
  lessons: LearningIndexLesson[],
  weight: number,
): { qualityScore: number; affinity: number } {
  if (!candidate) return { qualityScore: 0, affinity: 0 };
  const affinity = computeCorpusAffinity(candidate, lessons);
  return {
    qualityScore: candidate.score + affinity * weight,
    affinity,
  };
}

function compareCase(
  entry: PresetQualityCase,
  rawScoreNonRegressionFloor: number,
): PresetQualityComparison {
  const weight = entry.corpusAffinityWeight ?? 0.45;
  const withoutPriors = scoreCandidates(entry.candidates, entry.prompt);
  const withPriors = scoreCandidates(entry.candidates, entry.prompt, undefined, {
    corpusAffinityPrior: true,
    learningLessons: entry.learningLessons,
    corpusAffinityWeight: weight,
  });
  const topWithout = withoutPriors[0];
  const topWith = withPriors[0];
  const withoutScores = selectedQualityScore(topWithout, entry.learningLessons, weight);
  const withScores = selectedQualityScore(topWith, entry.learningLessons, weight);
  const rawWithout = topWithout?.score ?? 0;
  const rawWith = topWith?.score ?? 0;

  return {
    promptId: entry.promptId,
    prompt: entry.prompt,
    corpusAffinityWeight: round4(weight),
    scoreWithoutPriors: round4(withoutScores.qualityScore),
    scoreWithPriors: round4(withScores.qualityScore),
    rawTopScoreWithoutPriors: round4(rawWithout),
    rawTopScoreWithPriors: round4(rawWith),
    topAffinityWithoutPriors: round4(withoutScores.affinity),
    topAffinityWithPriors: round4(withScores.affinity),
    survivorsWithoutPriors: withoutPriors.length,
    survivorsWithPriors: withPriors.length,
    deltaScore: round4(withScores.qualityScore - withoutScores.qualityScore),
    deltaRawTopScore: round4(rawWith - rawWithout),
    deltaSurvivors: withPriors.length - withoutPriors.length,
    selectedPanelistWithoutPriors: topWithout?.panelist ?? null,
    selectedPanelistWithPriors: topWith?.panelist ?? null,
    orderingChanged: (topWithout?.panelist ?? null) !== (topWith?.panelist ?? null),
    nonRegression:
      rawWithout === 0 ? rawWith === 0 : rawWith >= rawWithout * rawScoreNonRegressionFloor,
    improved: withScores.qualityScore > withoutScores.qualityScore,
  };
}

export function buildPresetQualityReport(
  cases: PresetQualityCase[],
  options?: { rawScoreNonRegressionFloor?: number; generatedAtUtc?: string },
): PresetQualityReport {
  const rawScoreNonRegressionFloor = options?.rawScoreNonRegressionFloor ?? 0.98;
  const comparisons = cases.map((entry) => compareCase(entry, rawScoreNonRegressionFloor));
  const promptCount = comparisons.length;
  const sum = <T extends keyof PresetQualityComparison>(key: T): number =>
    comparisons.reduce((acc, row) => acc + Number(row[key] ?? 0), 0);

  return {
    schemaVersion: 1,
    generatedAtUtc: options?.generatedAtUtc ?? new Date().toISOString(),
    qualityMetric: "topSelectedScorePlusCorpusAffinity",
    promptCount,
    rawScoreNonRegressionFloor,
    comparisons,
    summary: {
      meanDeltaScore: round4(promptCount === 0 ? 0 : sum("deltaScore") / promptCount),
      meanRawTopScoreDelta: round4(
        promptCount === 0 ? 0 : sum("deltaRawTopScore") / promptCount,
      ),
      meanSurvivorDelta: round4(promptCount === 0 ? 0 : sum("deltaSurvivors") / promptCount),
      nonRegressionRate: round4(
        promptCount === 0
          ? 0
          : comparisons.filter((row) => row.nonRegression).length / promptCount,
      ),
      improvedRate: round4(
        promptCount === 0
          ? 0
          : comparisons.filter((row) => row.improved).length / promptCount,
      ),
      selectionChangeRate: round4(
        promptCount === 0
          ? 0
          : comparisons.filter((row) => row.orderingChanged).length / promptCount,
      ),
    },
  };
}

export const PRESET_QUALITY_EVAL_CASES: PresetQualityCase[] = [
  {
    promptId: "ambient-pad-001",
    prompt: "warm ambient pad with slow filter bloom and wide reverb",
    learningLessons: [
      {
        id: "lesson-pad",
        style: "lush ambient pad",
        character: "Wide and soft with long bloom.",
        causalReasoning: "Slow filter bloom plus spacious reverb produces the intended bed.",
        tags: ["pad", "ambient", "wide", "reverb"],
        mappingKeys: ["filter.cutoff", "fx.reverb.mix", "oscA.level"],
        priorityMappingKeys: ["filter.cutoff", "fx.reverb.mix"],
        fitnessScore: 0.92,
        fitnessConfidence: "high",
        stalenessDays: 2,
      },
    ],
    candidates: [
      mkCandidate(
        "LLAMA",
        0.84,
        "Sharp pluck transient with tight decay and dry center image for cut.",
        "bright transient pluck",
        mkState({ oscA: { level: 0.62 }, filter: { resonance: 0.71 }, fx: { delay: { mix: 0.08 } } }),
      ),
      mkCandidate(
        "QWEN",
        0.82,
        "Warm ambient pad with slow filter bloom, wide stereo wash, and deep reverb tail.",
        "lush ambient pad",
        mkState({
          oscA: { level: 0.58 },
          filter: { cutoff: 0.34 },
          fx: { reverb: { mix: 0.63 } },
        }),
      ),
      mkCandidate(
        "DEEPSEEK",
        0.79,
        "Soft pad texture with mild width and stable harmonic bed for support.",
        "soft support pad",
        mkState({ filter: { cutoff: 0.41 }, fx: { chorus: { mix: 0.24 } } }),
      ),
    ],
  },
  {
    promptId: "reese-bass-001",
    prompt: "dark reese bass with growl and movement",
    learningLessons: [
      {
        id: "lesson-reese",
        style: "dark reese bass",
        character: "Dense low-end with movement and growl.",
        causalReasoning: "Filter motion and stacked oscillators create evolving bass aggression.",
        tags: ["reese", "bass", "growl", "dark"],
        mappingKeys: ["filter.cutoff", "oscA.level", "oscB.level"],
        priorityMappingKeys: ["oscA.level", "oscB.level"],
        fitnessScore: 0.9,
        fitnessConfidence: "high",
        stalenessDays: 1,
      },
    ],
    candidates: [
      mkCandidate(
        "DEEPSEEK",
        0.85,
        "Bright lead edge with clean attack and focused upper-mid presence.",
        "bright lead",
        mkState({ oscA: { level: 0.32 }, filter: { cutoff: 0.8 } }),
      ),
      mkCandidate(
        "LLAMA",
        0.82,
        "Dark reese bass growl with moving filter body and stacked low oscillators.",
        "dark reese growl bass",
        mkState({
          oscA: { level: 0.71 },
          oscB: { level: 0.69 },
          filter: { cutoff: 0.28 },
        }),
      ),
      mkCandidate(
        "QWEN",
        0.78,
        "Moody bass with soft drive and restrained motion for the low end.",
        "moody bass",
        mkState({ oscA: { level: 0.55 }, filter: { cutoff: 0.37 } }),
      ),
    ],
  },
  {
    promptId: "lead-neutral-001",
    prompt: "modern lead with clear attack and pitch focus",
    learningLessons: [
      {
        id: "lesson-lead",
        style: "modern lead",
        character: "Focused transient and pitch clarity.",
        causalReasoning: "Clear attack and centered spectral balance keep the lead forward.",
        tags: ["lead", "attack", "focused"],
        mappingKeys: ["oscA.level", "filter.cutoff"],
        priorityMappingKeys: ["oscA.level"],
        fitnessScore: 0.78,
        fitnessConfidence: "medium",
        stalenessDays: 3,
      },
    ],
    candidates: [
      mkCandidate(
        "DEEPSEEK",
        0.88,
        "Modern lead with clear attack, focused pitch core, and stable cutoff placement.",
        "focused lead",
        mkState({ oscA: { level: 0.77 }, filter: { cutoff: 0.57 } }),
      ),
      mkCandidate(
        "LLAMA",
        0.84,
        "Soft pad edge with airy release and wide chorus spread behind the note.",
        "airy layer",
        mkState({ fx: { chorus: { mix: 0.44 } }, filter: { cutoff: 0.33 } }),
      ),
    ],
  },
  {
    promptId: "texture-nonreg-001",
    prompt: "dark texture with long motion and blurred edges",
    learningLessons: [
      {
        id: "lesson-texture",
        style: "dark texture",
        character: "Blurred, evolving, and spacious.",
        causalReasoning: "Long motion and blurred high-end produce the intended atmosphere.",
        tags: ["texture", "dark", "motion", "blurred"],
        mappingKeys: ["filter.cutoff", "fx.reverb.mix", "lfos.0.rate"],
        priorityMappingKeys: ["fx.reverb.mix", "lfos.0.rate"],
        fitnessScore: 0.88,
        fitnessConfidence: "high",
        stalenessDays: 4,
      },
    ],
    candidates: [
      mkCandidate(
        "LLAMA",
        0.87,
        "Bright stab with sharp front edge and short body.",
        "sharp stab",
        mkState({ oscA: { level: 0.62 }, filter: { cutoff: 0.75 } }),
      ),
      mkCandidate(
        "QWEN",
        0.853,
        "Dark texture with long motion, blurred edges, and reverb-heavy wash.",
        "dark blurred texture",
        mkState({
          filter: { cutoff: 0.29 },
          lfos: [{ rate: 0.17 }],
          fx: { reverb: { mix: 0.66 } },
        }),
      ),
    ],
  },
  {
    promptId: "no-match-neutral-001",
    prompt: "clean bell pluck with short release",
    learningLessons: [
      {
        id: "lesson-bass",
        style: "dark bass",
        character: "Dense and low.",
        causalReasoning: "Low-end emphasis supports bass intent.",
        tags: ["bass", "dark", "growl"],
        mappingKeys: ["oscB.level", "filter.cutoff"],
        priorityMappingKeys: ["oscB.level"],
        fitnessScore: 0.81,
        fitnessConfidence: "medium",
        stalenessDays: 2,
      },
    ],
    candidates: [
      mkCandidate(
        "QWEN",
        0.83,
        "Clean bell pluck with short release and bright upper harmonics.",
        "clean bell pluck",
        mkState({ oscA: { level: 0.48 }, filter: { cutoff: 0.74 } }),
      ),
      mkCandidate(
        "LLAMA",
        0.8,
        "Rounder bell with more body and slower release tail.",
        "round bell",
        mkState({ oscA: { level: 0.51 }, filter: { cutoff: 0.64 } }),
      ),
    ],
  },
];
