import { logEvent } from "../telemetry";
import { interpretTask } from "./task-interpreter";
import { resolveContext } from "./context-resolver-logic";
import { selectPolicy } from "./policy-selector";
import { solveParameters } from "./parameter-solver-logic";
import { type TransmutationResult, type WikiKnowledgeBase, PolicyFamily } from "./transmutation-types";
import { TRANSMUTATION_BOUNDS } from "./transmutation-bounds";

/**
 * Pure logic for AIOM Phase 1 Transmutation Module (browser-safe).
 * Runs: interpret → resolve → select → solve → emit audit trace.
 * Never throws — fallback strictly to BASELINE_STATIC with fallback_used=true on failure.
 */
export function resolveTransmutation(
  prompt: string,
  opts?: {
    learningIndex?: any;
    tasteIndex?: any;
    refineryOverrides?: any;
    recentExports?: string[];
    projectContext?: { genre_hint?: string; session_id?: string };
    wikiKnowledge?: WikiKnowledgeBase;
    domainVocabulary?: string[];
    coreConcepts?: string[];
  },
  _terminator?: () => void
): TransmutationResult {
  try {
    const task = interpretTask(prompt, {
      domainVocabulary: opts?.domainVocabulary ?? opts?.wikiKnowledge?.domain_vocabulary,
    });
    const context = resolveContext(task, {
      learningIndex: opts?.learningIndex,
      tasteIndex: opts?.tasteIndex,
      recentExports: opts?.recentExports,
      wikiKnowledge: opts?.wikiKnowledge,
      domainVocabulary: opts?.domainVocabulary,
      coreConcepts: opts?.coreConcepts,
    });
    const policy = selectPolicy(task, context);
    const { profile, audit } = solveParameters(policy, task, context, {
      refineryOverrides: opts?.refineryOverrides,
    });

    logEvent("transmutation_profile_emitted", {
      policy_family: policy,
      confidence: task.confidence,
      fallback_used: false,
      deltas_summary: audit.deltas_applied.join(", "),
      bounds_checks: audit.bounds_checks,
      task_type: task.task_type,
      cluster: profile.context_injection.cluster,
      prompt_length: prompt.length,
    });

    return {
      transmutation_profile: profile,
      audit_trace: audit,
      confidence: task.confidence,
      fallback_used: false,
    };
  } catch (err) {
    const baseline = getBaselineResult(opts?.wikiKnowledge, opts?.domainVocabulary, opts?.coreConcepts);
    logEvent("transmutation_profile_emitted", {
      policy_family: PolicyFamily.BASELINE_STATIC,
      confidence: 0,
      fallback_used: true,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ...baseline, fallback_used: true };
  }
}

function getBaselineResult(
  wikiKnowledge?: WikiKnowledgeBase,
  domainVocabulary?: string[],
  coreConcepts?: string[],
): TransmutationResult {
  const triad_weights = { ...TRANSMUTATION_BOUNDS.baseline_triad_weights };
  return {
    transmutation_profile: {
      triad_weights,
      gate_offsets: { slavic_threshold_delta: 0, novelty_gate_delta: 0 },
      priors: { taste_weight: 0.06, corpus_affinity_weight: 0.45, lesson_weight: 0.5 },
      context_injection: {
        lessons: [],
        cluster: null,
        wiki_knowledge: wikiKnowledge,
        domain_vocabulary: domainVocabulary ?? wikiKnowledge?.domain_vocabulary,
        core_concepts: coreConcepts ?? wikiKnowledge?.core_concepts,
      },
      verification_profile: { aiom_strictness: 0.5, drift_tolerance: 0.07 },
    },
    audit_trace: {
      policy_family: PolicyFamily.BASELINE_STATIC,
      reasons: ["fallback"],
      deltas_applied: [],
      bounds_checks: [],
      confidence: 0,
    },
    confidence: 0,
    fallback_used: false,
  };
}
