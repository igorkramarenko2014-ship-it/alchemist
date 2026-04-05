import { PolicyFamily, type TaskSchema, type ContextPack } from "./transmutation-types";

/**
 * Select PolicyFamily from TaskSchema + ContextPack.
 * Order matters (priority rules first).
 */
export function selectPolicy(task: TaskSchema, context: ContextPack): PolicyFamily {
  const hasWikiDomainSignal =
    (context.core_concepts?.length ?? 0) > 0 ||
    (context.domain_vocabulary?.length ?? 0) > 0 ||
    (context.wiki_knowledge?.articles.length ?? 0) > 0;

  // BASELINE: Absolutely no prompt signals.
  if (task.task_type === "unknown" && task.target_mood.length === 0 && task.genre_affinity.length === 0 && task.novelty_preference === 0.5) {
    return PolicyFamily.BASELINE_STATIC;
  }

  // NOVELTY / EXPLORATION: user actively asked for "something different" or "novel".
  if (task.novelty_preference > 0.6) {
    return PolicyFamily.EXPLORATION;
  }

  // SESSION CONSISTENCY: user is in a flow with multiple recent exports.
  if (context.recent_exports_count >= 3 && context.corpus_density > 0.4) {
    return PolicyFamily.SESSION_CONSISTENCY;
  }

  // CORPUS LED: we found very strong lesson matches and the prompt is high-confidence.
  if (context.corpus_density > 0.6 && task.confidence > 0.7) {
    return PolicyFamily.CORPUS_LED;
  }

  // DOMAIN LED: wiki bootstrap supplied a meaningful domain map and the prompt has decent signal.
  if (hasWikiDomainSignal && task.confidence >= 0.65) {
    return PolicyFamily.CORPUS_LED;
  }

  // TASTE LED: we have strong taste-index clusters and some recent activity.
  if (context.taste_prior_strength > 0.6 && context.recent_exports_count >= 2) {
    return PolicyFamily.TASTE_LED;
  }

  // AMBIGUITY / GUARDRAIL: if we don't know enough, don't deviate.
  if (task.confidence < 0.5 || (context.corpus_density < 0.2 && context.taste_prior_strength < 0.3)) {
    return PolicyFamily.GUARDED_AMBIGUITY;
  }

  // Default fallback
  return PolicyFamily.BASELINE_STATIC;
}
