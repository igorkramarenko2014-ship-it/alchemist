import type {
  AIAnalysis,
  AICandidate,
  DecisionReceipt,
  DecisionReceiptRejectionReason,
} from "@alchemist/shared-types";
import {
  cosineSimilarityParamArrays,
  SLAVIC_FILTER_COSINE_THRESHOLD,
} from "../score";
import { REASONING_LEGIBILITY_MIN_CHARS } from "../validate";

type ReceiptSystemStateInput = Partial<DecisionReceipt["systemState"]>;

function candidateId(c: AICandidate, index: number): string {
  return `${c.panelist.toLowerCase()}_${index + 1}`;
}

function triadModeLabel(analysis: AIAnalysis): string {
  const tel = analysis.triadRunTelemetry;
  if (!tel) return "unknown";
  if (tel.triadEarlyResolveTwo) {
    const late =
      tel.triadLateJoinerPanelist ??
      tel.triadPanelOutcomes?.find((o) => o.failed || o.candidateCount === 0)?.panelist;
    return late
      ? `partial_high_confidence (late_joiner=${late})`
      : "partial_high_confidence";
  }
  return tel.triadRunMode;
}

function detectDuplicateReason(
  selected: AICandidate,
  candidate: AICandidate,
): string | null {
  if (!selected.paramArray || !candidate.paramArray) return null;
  if (selected.paramArray.length === 0 || candidate.paramArray.length === 0) return null;
  const cosine = cosineSimilarityParamArrays(selected.paramArray, candidate.paramArray);
  if (cosine <= SLAVIC_FILTER_COSINE_THRESHOLD) return null;
  return `duplicate pattern (cosine=${cosine.toFixed(2)} > ${SLAVIC_FILTER_COSINE_THRESHOLD.toFixed(2)})`;
}

function detectLegibilityReason(candidate: AICandidate): string | null {
  const n = candidate.reasoning.trim().length;
  if (n >= REASONING_LEGIBILITY_MIN_CHARS) return null;
  return `low reasoning clarity (< ${REASONING_LEGIBILITY_MIN_CHARS} chars)`;
}

function buildRejectionReasons(scoredCandidates: AICandidate[]): DecisionReceiptRejectionReason[] {
  if (scoredCandidates.length <= 1) return [];
  const selected = scoredCandidates[0];
  return scoredCandidates
    .slice(1, 4)
    .map((c, i) => {
      const duplicate = detectDuplicateReason(selected, c);
      const lowReasoning = detectLegibilityReason(c);
      const reason =
        duplicate ??
        lowReasoning ??
        `ranked lower than selected (${c.score.toFixed(2)} < ${selected.score.toFixed(2)})`;
      return {
        candidateId: candidateId(c, i + 1),
        reason,
      };
    });
}

export function generateDecisionReceipt(
  triadResult: AIAnalysis,
  scoredCandidates: AICandidate[],
  systemState: ReceiptSystemStateInput = {},
): DecisionReceipt {
  const selected = scoredCandidates[0] ?? null;
  const rejectionReasons = buildRejectionReasons(scoredCandidates);
  const selectionReason: string[] = [];
  if (selected) {
    selectionReason.push(`highest ranked score (${selected.score.toFixed(2)})`);
    selectionReason.push("passed Undercover distribution + adversarial gates");
    if (!rejectionReasons.some((r) => r.reason.startsWith("duplicate pattern"))) {
      selectionReason.push("no high-cosine collision among top alternatives");
    }
  } else {
    selectionReason.push("no gate-passing candidates were available");
  }
  const tel = triadResult.triadRunTelemetry;
  const inferredStubUsage =
    tel?.triadRunMode === "stub" || tel?.triadParityMode === "stub";
  return {
    triadMode: triadModeLabel(triadResult),
    selectedCandidateId: selected ? candidateId(selected, 0) : null,
    selectionReason,
    rejectionReasons,
    systemState: {
      wasmStatus: systemState.wasmStatus ?? "unknown",
      hardGateStatus: systemState.hardGateStatus ?? "enforced",
      stubUsage: systemState.stubUsage ?? inferredStubUsage,
    },
  };
}

/** Branding alias for external AIOM-facing docs/prompts; same pure projection logic. */
export const generateAIOMReceipt = generateDecisionReceipt;
