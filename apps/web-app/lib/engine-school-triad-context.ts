import {
  buildLearningContext,
  selectLessonsForPrompt,
  type TriadRunLearningContextUsed,
} from "@alchemist/shared-engine";
import { loadLearningIndex } from "@alchemist/shared-engine/node";
import { env } from "@/env";

/**
 * Engine School prompt suffix for live triad fetchers. **Opt-in:** set `ALCHEMIST_LEARNING_CONTEXT=1`
 * and run `pnpm learning:build-index` so `learning-index.json` exists next to the loader in `shared-engine`.
 */
export function getEngineSchoolTriadAugmentation(userPrompt: string): {
  learningContext: string;
  learningContextUsed: TriadRunLearningContextUsed;
} {
  const empty: TriadRunLearningContextUsed = { injected: false, selectedLessonIds: [] };
  if (!env.learningContextEnabled) {
    return { learningContext: "", learningContextUsed: empty };
  }
  const index = loadLearningIndex();
  if (!index) {
    return { learningContext: "", learningContextUsed: empty };
  }
  const selected = selectLessonsForPrompt(index, userPrompt);
  const learningContext = buildLearningContext(selected);
  return {
    learningContext,
    learningContextUsed: {
      injected: learningContext.length > 0,
      selectedLessonIds: selected.map((l) => l.id),
    },
  };
}
