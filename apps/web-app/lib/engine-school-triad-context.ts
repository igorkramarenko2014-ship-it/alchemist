import {
  buildLearningContext,
  logEvent,
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
  const empty: TriadRunLearningContextUsed = {
    injected: false,
    selectedLessonIds: [],
    contextCharCount: 0,
    selectedClusters: [],
  };
  if (!env.learningContextEnabled) {
    return { learningContext: "", learningContextUsed: empty };
  }
  const index = loadLearningIndex();
  if (!index) {
    return { learningContext: "", learningContextUsed: empty };
  }
  const selected = selectLessonsForPrompt(index, userPrompt);

  // Telemetry for Sve chat fusion (advisory influence only)
  const sveLessons = selected.filter((l) => l.tags.includes("sve-fusion"));
  if (sveLessons.length > 0) {
    logEvent("engine_school_influence", {
      source: "sve_real_chat",
      lessonIds: sveLessons.map((l) => l.id),
      promptLen: userPrompt.length,
    });
  }

  const learningContext = buildLearningContext(selected);
  const fitnessRows = index.fitnessSnapshot?.lessonFitness;
  const fitnessById = new Map(
    Array.isArray(fitnessRows)
      ? fitnessRows.map((r: { lessonId?: string }) => [r.lessonId ?? "", r] as const)
      : [],
  );
  const lessonFitnessTrace = selected.map((l) => {
    const r = fitnessById.get(l.id) as
      | { fitnessScore?: number; fitnessConfidence?: string }
      | undefined;
    return {
      lessonId: l.id,
      fitnessScore:
        r != null && typeof r.fitnessScore === "number" && Number.isFinite(r.fitnessScore)
          ? r.fitnessScore
          : null,
      fitnessConfidence:
        r != null && typeof r.fitnessConfidence === "string" ? r.fitnessConfidence : null,
    };
  });
  return {
    learningContext,
    learningContextUsed: {
      injected: learningContext.length > 0,
      selectedLessonIds: selected.map((l) => l.id),
      contextCharCount: learningContext.length,
      selectedClusters: selected
        .map((l) => l.cluster)
        .filter((c): c is string => typeof c === "string" && c.trim().length > 0),
      lessonFitnessTrace,
    },
  };
}
