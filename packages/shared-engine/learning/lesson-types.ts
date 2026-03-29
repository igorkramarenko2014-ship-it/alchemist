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
};

export type LearningIndex = {
  generatedAtUtc: string;
  schemaVersion: string;
  lessonCount: number;
  lessons: LearningLesson[];
};
