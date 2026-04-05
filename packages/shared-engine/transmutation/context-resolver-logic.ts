import type { TaskSchema, ContextPack } from "./transmutation-types";

/**
 * Builds ContextPack from available engine state (browser-safe).
 * - lesson_matches: top-2 by keyword overlap with TaskSchema
 * - cluster_affinity: from taste-index dominant clusters
 */
export function resolveContext(
  task: TaskSchema,
  opts?: {
    learningIndex?: any;
    tasteIndex?: any;
    recentExports?: string[];
    wikiKnowledge?: ContextPack["wiki_knowledge"];
    domainVocabulary?: string[];
    coreConcepts?: string[];
  }
): ContextPack {
  const learningIndex = opts?.learningIndex;
  const tasteIndex = opts?.tasteIndex;

  // Lesson matches: Keyword-based naive top-2
  const matchedLessons: string[] = [];
  if (learningIndex && Array.isArray(learningIndex.lessons)) {
    const lessons = learningIndex.lessons as any[];
    const scores = lessons.map((l) => {
      let score = 0;
      const tags = Array.isArray(l.tags) ? l.tags.map((t: string) => t.toLowerCase()) : [];
      if (tags.includes(task.task_type)) score += 3;
      for (const m of task.target_mood) {
        if (tags.includes(m)) score += 1;
      }
      return { id: l.id || l.lessonId, score };
    });

    scores.sort((a, b) => b.score - a.score);
    matchedLessons.push(...scores.filter((s) => s.score > 0).slice(0, 2).map((s) => s.id));
  }

  // Taste cluster affinity from taste-index
  const cluster_affinity: Record<string, number> = {};
  let taste_prior_strength = 0;
  if (tasteIndex && Array.isArray(tasteIndex.clusters)) {
    const clusters = tasteIndex.clusters;
    for (const c of clusters) {
      if (c.id && typeof c.confidence === "number") {
        cluster_affinity[c.id] = c.confidence;
      }
    }
    taste_prior_strength = typeof tasteIndex.overallConfidence === "number" ? tasteIndex.overallConfidence : 0.5;
  }

  const recent_exports_count = opts?.recentExports?.length || 0;
  const totalLessons = learningIndex && Array.isArray(learningIndex.lessons) ? learningIndex.lessons.length : 1;
  const corpus_density = matchedLessons.length / (totalLessons || 1);

  return {
    lesson_matches: matchedLessons,
    cluster_affinity,
    recent_exports_count,
    taste_prior_strength,
    corpus_density,
    wiki_knowledge: opts?.wikiKnowledge,
    domain_vocabulary: opts?.domainVocabulary ?? opts?.wikiKnowledge?.domain_vocabulary,
    core_concepts: opts?.coreConcepts ?? opts?.wikiKnowledge?.core_concepts,
  };
}
