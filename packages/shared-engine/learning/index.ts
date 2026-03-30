export { computeCorpusAffinity, collectLeafParamPaths } from "./compute-corpus-affinity";
export type { LearningIndexLesson } from "./compute-corpus-affinity";
export type { LearningIndex, LearningLesson } from "./lesson-types";
export {
  selectLessonsForPrompt,
  type SelectLessonsOptions,
  type SelectedLesson,
} from "./select-lessons-for-prompt";
export {
  buildLearningContext,
  ENGINE_SCHOOL_CONTEXT_ADVISORY_LINE,
  ENGINE_SCHOOL_CONTEXT_DESCRIPTIVE_LINE,
} from "./build-learning-context";
export {
  buildPresetQualityReport,
  PRESET_QUALITY_EVAL_CASES,
} from "./preset-quality";
export type {
  PresetQualityCase,
  PresetQualityComparison,
  PresetQualityReport,
  PresetQualityReportSummary,
} from "./preset-quality";
