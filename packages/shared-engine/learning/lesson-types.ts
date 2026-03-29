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
  /** Sample = unique `triadSessionId` count in telemetry window — advisory. */
  sampleCount?: number;
  /** `low` / `medium` / `high` from sample thresholds (e.g. &lt;10 / 10–19 / ≥20). */
  fitnessConfidence?: "low" | "medium" | "high";
  /** Days since last JSONL evidence for this lesson — advisory staleness for weighting. */
  stalenessDays?: number;
};

export type LearningIndex = {
  generatedAtUtc: string;
  schemaVersion: string;
  lessonCount: number;
  lessons: LearningLesson[];
  /** Present after aggregate + merge — operators may ignore in clients that only read `lessons`. */
  fitnessSnapshot?: {
    generatedAtUtc: string;
    aggregationVersion?: number;
    lessonFitness?: Array<{ lessonId: string; fitnessScore?: number; [k: string]: unknown }>;
    /** Non-authoritative outcome trend for operators — not gate law. */
    learningOutcomes?: {
      candidateSuccessRate?: number;
      meanBestScoreWithLessons?: number;
      orderChangeRate?: number;
      tasteClusterHitRate?: number;
      authoritative?: boolean;
      note?: string;
    };
    totalEventsProcessed: number;
    coverage?: { learningCoverage?: number; styleCoverage?: number };
  };
};
