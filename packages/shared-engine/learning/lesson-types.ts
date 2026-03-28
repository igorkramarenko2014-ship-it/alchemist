/** Shapes for `learning-index.json` — no Node imports (safe for client bundles). */

export type LearningLesson = {
  id: string;
  style: string;
  character: string;
  causalReasoning: string;
  tags: string[];
  mappingKeys: string[];
};

export type LearningIndex = {
  generatedAtUtc: string;
  schemaVersion: string;
  lessonCount: number;
  lessons: LearningLesson[];
};
