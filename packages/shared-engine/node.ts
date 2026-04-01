/**
 * Node-only surface: `loadLearningIndex` reads the filesystem.
 * Import from `@alchemist/shared-engine/node` in server code, scripts, and tests — not from client components.
 */
export { loadLearningIndex } from "./learning/load-learning-index";
export type { LearningIndex, LearningLesson } from "./learning/lesson-types";
export { loadTasteIndex } from "./learning/taste/load-taste-index";
export type { TasteIndex } from "./learning/taste/taste-types";

// GFUSC Node hooks
export {
  appendGFUSCDryrunRecord,
  handleGFUSCVerdict,
  resolveGFUSCMode,
} from "./gfusc/dryrun";
export { executeKillswitch, findMonorepoRoot } from "./gfusc/runner";

// Transmutation Node runner
export { resolveTransmutation } from "./transmutation/transmutation-runner";

// Ledgers and Sinks (Node-only)
export { readTokenLedger, recordTokenUsage } from "./token-ledger";
export { recordRllOutcomeEvent } from "./rll/outcome-sink";
export { buildPnhImmunityLedger, recordImmunity } from "./pnh/immunity-ledger";

// Safety Audit (Node-only)
export {
  appendSafetyAuditLogRecord,
  readSafetyAuditLog,
  verifySafetyAuditLogIntegrity,
} from "./safety-audit-log";

export type { SafetyAuditLogRecord } from "./safety-audit-log";
export type {
  GFUSCDryrunRecord,
  GFUSCMode,
  HandleGFUSCVerdictOutcome,
  HandleGFUSCVerdictOptions,
} from "./gfusc/dryrun";
