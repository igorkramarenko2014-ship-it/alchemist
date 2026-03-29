/** Shapes for `learning-index.json` — no Node imports (safe for client bundles). */

export type LearningLesson = {
  id: string;
  style: string;
  character: string;
  causalReasoning: string;
  tags: string[];
  mappingKeys: string[];
  /** Top 2–3 keys from `mappings` — decision layer, optional when index built from older corpus */
  priorityMappingKeys?: string[];
  /** Minimal irreducible rules — optional when index built from older corpus */
  coreRules?: string[];
  /** Explicit contrast to another lesson id — optional when index built from older corpus */
  contrastWith?: { lessonId: string; difference: string };
  /** Pedagogical tier from corpus v1.1+ */
  difficulty?: "beginner" | "intermediate" | "advanced";
  /** Monotonic lesson file revision */
  lessonVersion?: number;
  /** Count of anti-pattern entries (full text stays in corpus JSON) */
  antiPatternCount?: number;
  /** Structured contrast partner id when present */
  contrastMatrixVs?: string;
  /** Archetype bucket for cluster-first selection (schema ≥1.2 / optional on older rows). */
  cluster?: string;
  /** From `pnpm learning:aggregate-telemetry` → build-index merge — advisory Phase 3 weighting only. */
  fitnessScore?: number;
};

export type LearningIndex = {
  generatedAtUtc: string;
  schemaVersion: string;
  lessonCount: number;
  lessons: LearningLesson[];
  /** Present after aggregate + merge — operators may ignore in clients that only read `lessons`. */
  fitnessSnapshot?: {
    generatedAtUtc: string;
    lessonFitness?: Array<{ lessonId: string; fitnessScore?: number; [k: string]: unknown }>;
    totalEventsProcessed: number;
    coverage?: { learningCoverage?: number; styleCoverage?: number };
  };
};
