import type { 
  AICandidate, 
  Panelist, 
  AIAnalysis, 
  TokenUsageMetrics, 
  CognitiveDelta, 
  DivergenceReport, 
  HestiaEval, 
  RoundLog,
  AlchemistCodename
} from "@alchemist/shared-types";
import { createHash } from "crypto";
import { 
  cosineSimilarityParamArrays, 
  diceBigramSimilarity, 
  weightedScore,
  effectivePanelistWeight
} from "./score";
import { computeIntentAlignmentScore } from "./intent-alignment";
import { 
  PANELIST_ALCHEMIST_CODENAME, 
  computeTriadGovernance 
} from "./triad-panel-governance";
import { triadPanelistSystemPrompt } from "./triad-panelist-prompt";
import { logEvent } from "./telemetry";
import { TRIAD_PANELIST_CLIENT_TIMEOUT_MS } from "./constants";
import { TRIAD_PANELISTS } from "./triad";
import { nowMs } from "./triad-monitor";

/** 
 * Quantum Cycle Stage 1: Fixed Round-Robin Summaries 
 * HERMES (LLAMA) -> HESTIA (QWEN) -> ATHENA (DEEPSEEK) 
 */
const QUANTUM_ORDER: Panelist[] = ["LLAMA", "QWEN", "DEEPSEEK"];

interface QuantumRoundResult {
  panelist: Panelist;
  candidates: AICandidate[];
  durationMs: number;
  tokenUsage?: TokenUsageMetrics | null;
  failed: boolean;
}

export interface QuantumCycleOptions {
  runId: string;
  fetcher: (
    prompt: string,
    panelist: Panelist,
    signal: AbortSignal,
    ctx?: { triadSessionId: string }
  ) => Promise<AICandidate[] | { candidates: AICandidate[]; tokenUsage?: TokenUsageMetrics | null }>;
  signal?: AbortSignal;
  userMode?: "PRO" | "NEWBIE";
  learningContext?: string;
}

function hashCandidate(c: AICandidate): string {
  const data = {
    paramArray: c.paramArray,
    reasoning: c.reasoning,
    score: c.score
  };
  return createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 12);
}

function getSummary(c: AICandidate | undefined): string {
  if (!c) return "NONE";
  return c.description || c.reasoning.slice(0, 150) + "...";
}

/** 
 * Stage 1 Impact Score: weighted average change in paramArray vectors.
 * High movement in parameters = high impact.
 */
function calculateImpactScore(r1: AICandidate, r2: AICandidate): number {
  if (!r1.paramArray || !r2.paramArray) return 0.5;
  const dist = 1 - cosineSimilarityParamArrays(r1.paramArray, r2.paramArray);
  return Math.min(1, dist * 2); // Boosted sensitivity for param delta
}

export async function runQuantumCycle(
  prompt: string,
  options: QuantumCycleOptions
): Promise<{ 
  analysis: AIAnalysis; 
  quantumTelemetry: NonNullable<AIAnalysis["triadRunTelemetry"]>["quantumCycle"] 
}> {
  const { runId, fetcher, signal, userMode, learningContext } = options;
  const roundLogs: RoundLog[] = [];
  let fallbackUsed = false;
  let fallbackReason: string | undefined;

  // --- ROUND 1: Independent Signal ---
  logEvent("quantum_cycle_round_start", { runId, round: 1 });
  const r1Promises = TRIAD_PANELISTS.map(async (panelist) => {
    const t0 = nowMs();
    try {
      const sysPrompt = triadPanelistSystemPrompt(panelist, { learningContext, quantumRound: 1 });
      const res = await fetcher(prompt, panelist, signal!, { triadSessionId: runId });
      const candidates = Array.isArray(res) ? res : res.candidates;
      const tokenUsage = Array.isArray(res) ? null : res.tokenUsage;
      const durationMs = nowMs() - t0;
      
      const best = candidates[0];
      roundLogs.push({
        runId,
        round: 1,
        agent: PANELIST_ALCHEMIST_CODENAME[panelist] as AlchemistCodename,
        input_summary: prompt.slice(0, 200),
        output_summary: getSummary(best).slice(0, 200),
        timestamp: new Date().toISOString()
      });

      return { panelist, candidates, durationMs, tokenUsage, failed: false };
    } catch (err) {
      logEvent("quantum_round_failed", { runId, round: 1, panelist, error: String(err) });
      return { panelist, candidates: [], durationMs: nowMs() - t0, failed: true };
    }
  });

  const r1Results = await Promise.all(r1Promises);
  const r1Map = new Map(r1Results.map(r => [r.panelist, r]));

  if (r1Results.some(r => r.failed || r.candidates.length === 0)) {
    fallbackUsed = true;
    fallbackReason = "round_1_incomplete";
  }

  // --- ROUND 2: Contextual Revision ---
  const r2Results: QuantumRoundResult[] = [];
  const deltas: CognitiveDelta[] = [];

  if (!fallbackUsed) {
    logEvent("quantum_cycle_round_start", { runId, round: 2 });
    const r2Promises = TRIAD_PANELISTS.map(async (panelist) => {
      const t0 = nowMs();
      const others = TRIAD_PANELISTS.filter(p => p !== panelist);
      const summaries = others.map(p => {
        const codename = PANELIST_ALCHEMIST_CODENAME[p];
        const best = r1Map.get(p)?.candidates[0];
        return `${codename} Round 1: ${getSummary(best)}`;
      });

      try {
        const sysPrompt = triadPanelistSystemPrompt(panelist, { 
          learningContext, 
          quantumRound: 2,
          contextSummaries: summaries 
        });
        
        // Inject contextual summaries into the user prompt for Stage 1.
        const contextualPrompt = `${prompt}\n\nCONTEXT_FROM_OTHER_PANELISTS:\n${summaries.join("\n")}`;
        
        const res = await fetcher(contextualPrompt, panelist, signal!, { triadSessionId: runId });
        const candidates = Array.isArray(res) ? res : res.candidates;
        const tokenUsage = Array.isArray(res) ? null : res.tokenUsage;
        const durationMs = nowMs() - t0;
        
        const bestR2 = candidates[0];
        const bestR1 = r1Map.get(panelist)!.candidates[0];

        if (bestR2 && bestR1) {
          const novelty = 1 - (bestR2.paramArray && bestR1.paramArray 
            ? cosineSimilarityParamArrays(bestR2.paramArray, bestR1.paramArray)
            : diceBigramSimilarity(bestR1.reasoning, bestR2.reasoning));
          
          const coherence = computeIntentAlignmentScore(prompt, bestR2, { userMode });
          const impact = calculateImpactScore(bestR1, bestR2);
          
          const deltaType = novelty < 0.15 ? "noise" : novelty > 0.35 ? "expand" : "refine";

          const delta: CognitiveDelta = {
            agent: PANELIST_ALCHEMIST_CODENAME[panelist] as AlchemistCodename,
            round: 2,
            delta_type: deltaType,
            novelty_score: novelty,
            coherence_score: coherence,
            impact_score: impact,
            state_hash_before: hashCandidate(bestR1),
            state_hash_after: hashCandidate(bestR2),
            summary: (bestR2 as any).summary || "Revision applied based on peer context."
          };
          
          deltas.push(delta);
          roundLogs.push({
            runId,
            round: 2,
            agent: PANELIST_ALCHEMIST_CODENAME[panelist] as AlchemistCodename,
            input_summary: contextualPrompt.slice(0, 200),
            output_summary: getSummary(bestR2).slice(0, 200),
            delta,
            timestamp: new Date().toISOString()
          });
        }

        return { panelist, candidates, durationMs, tokenUsage, failed: false };
      } catch (err) {
        logEvent("quantum_round_failed", { runId, round: 2, panelist, error: String(err) });
        return { panelist, candidates: [], durationMs: nowMs() - t0, failed: true };
      }
    });

    const results = await Promise.all(r2Promises);
    results.forEach(r => r2Results.push(r));

    if (r2Results.some(r => r.failed || r.candidates.length === 0)) {
      fallbackUsed = true;
      fallbackReason = "round_2_incomplete";
    }
  }

  // --- POST-PROCESSING ---
  const finalCandidates: AICandidate[] = [];
  let divergenceReport: DivergenceReport = {
    divergence: false,
    max_delta_agent: "ATHENA",
    divergence_score: 0,
    requires_review: false
  };

  if (!fallbackUsed) {
    // Round 2 results are primary
    r2Results.forEach(r => {
      finalCandidates.push(...r.candidates.map(c => ({
        ...c,
        // Apply weights ONLY to Round 2 outputs (implied by filtering deltas later)
      })));
    });

    // Compute Divergence
    if (deltas.length > 0) {
      const scores = deltas.map(d => (0.4 * d.novelty_score) + (0.35 * d.coherence_score) + (0.25 * d.impact_score));
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const spread = maxScore - minScore;
      const maxAgent = deltas[scores.indexOf(maxScore)].agent;
      
      divergenceReport = {
        divergence: spread > 0.3,
        max_delta_agent: maxAgent,
        divergence_score: spread,
        requires_review: spread > 0.5
      };
    }
  } else {
    // Fallback to Round 1
    r1Results.forEach(r => {
      finalCandidates.push(...r.candidates);
    });
  }

  // Hestia Risk Evaluation (Stage 1 specific extraction)
  const hestiaR2 = r2Results.find(r => r.panelist === "QWEN")?.candidates[0];
  let hestiaEval: HestiaEval | undefined;
  if (hestiaR2) {
    hestiaEval = {
      risk_score: (hestiaR2 as any).risk_score ?? 0.2, // mock or parse
      choke_flag: (hestiaR2 as any).choke_flag ?? false,
      override_available: true,
      risk_reason: (hestiaR2 as any).risk_reason || "Nominal textural alignment."
    };
  }

  const quantumCycleTelemetry = {
    roundLogs,
    divergenceReport,
    hestiaEval,
    fallbackUsed,
    fallbackReason
  };

  const analysis: AIAnalysis = {
    candidates: finalCandidates,
    triadRunTelemetry: {
      meanPanelistMs: (r1Results.reduce((a, b) => a + b.durationMs, 0) + r2Results.reduce((a, b) => a + b.durationMs, 0)) / (r1Results.length + r2Results.length),
      triadFailureRate: fallbackUsed ? 1 : 0,
      gateDropRate: 0,
      triadRunMode: "fetcher",
      rawCandidateCount: finalCandidates.length,
      afterGateCount: finalCandidates.length,
      triadParityMode: fallbackUsed ? "mixed" : "fully_live",
      triadDegraded: fallbackUsed,
      quantumCycle: quantumCycleTelemetry
    }
  };

  return { analysis, quantumTelemetry: quantumCycleTelemetry };
}
