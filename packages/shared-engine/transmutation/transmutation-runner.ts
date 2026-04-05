import { logEvent } from "../telemetry";
import { resolveTransmutation as resolveTransmutationLogic } from "./transmutation-runner-logic";
import { resolveContext } from "./context-resolver";
import { interpretTask } from "./task-interpreter";
import { selectPolicy } from "./policy-selector";
import { solveParameters } from "./parameter-solver";
import { type TransmutationResult, type WikiKnowledgeBase, PolicyFamily } from "./transmutation-types";

/**
 * Main entry point for AIOM Phase 1 Transmutation Module (Node only).
 * Resolves paths from disk then calls pure logic.
 */
export function resolveTransmutation(
  prompt: string,
  opts?: {
    learningIndexPath?: string;
    tasteIndexPath?: string;
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
    // Node-specific resolveContext handles FS
    const context = resolveContext(task, opts);
    const policy = selectPolicy(task, context);
    // Node-specific solveParameters handles Refinery FS
    const { profile, audit } = solveParameters(policy, task, context);

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
    // Falls back to logic version's baseline (effectively same)
    return resolveTransmutationLogic(prompt, {
      recentExports: opts?.recentExports,
      projectContext: opts?.projectContext,
      wikiKnowledge: opts?.wikiKnowledge,
      domainVocabulary: opts?.domainVocabulary,
      coreConcepts: opts?.coreConcepts,
    });
  }
}
