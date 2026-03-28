/**
 * Node-only surface: `loadLearningIndex` reads the filesystem.
 * Import from `@alchemist/shared-engine/node` in server code, scripts, and tests — not from client components.
 */
export { loadLearningIndex } from "./learning/load-learning-index";
export type { LearningIndex, LearningLesson } from "./learning/lesson-types";
