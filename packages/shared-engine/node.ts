/**
 * Node-only surface: `loadLearningIndex` reads the filesystem.
 * Import from `@alchemist/shared-engine/node` in server code, scripts, and tests — not from client components.
 */
export { loadLearningIndex } from "./learning/load-learning-index";
export type { LearningIndex, LearningLesson } from "./learning/lesson-types";
export { loadTasteIndex } from "./learning/taste/load-taste-index";
export type { TasteIndex } from "./learning/taste/taste-types";
export {
  appendSafetyAuditLogRecord,
  readSafetyAuditLog,
  verifySafetyAuditLogIntegrity,
} from "./safety-audit-log";
export type { SafetyAuditLogRecord } from "./safety-audit-log";
