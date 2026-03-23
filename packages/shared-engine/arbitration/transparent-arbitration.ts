/**
 * Three-stage, deterministic 2-of-3 arbitration over two strategies.
 * All stages emit **`logEvent`** — no hidden kernel, no Slavic bypass, no module-cache tricks.
 */
import type { AICandidate } from "@alchemist/shared-types";
import { BRAIN_ARBITRATION_AGENT_AJI_FUSION_LINES } from "../brain-fusion-calibration.gen";
import { logEvent } from "../telemetry";
import { scoreCandidates, weightedScore } from "../score";
import type {
  ArbitrationContext,
  ArbitrationStageVote,
  ArbitrationStrategyId,
  TransparentArbitrationResult,
} from "./types";

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h, 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

function poolFingerprint(candidates: AICandidate[]): string {
  let acc = 0;
  const parts: string[] = [];
  for (const c of candidates) {
    acc += c.score;
    parts.push(c.panelist, c.reasoning.slice(0, 64));
  }
  return `${acc.toFixed(4)}|${parts.join("|")}`;
}

function deterministicVote(seed: string): ArbitrationStrategyId {
  return djb2(seed) % 2 === 0 ? "ALPHA" : "OMEGA";
}

function orderForStrategy(
  candidates: AICandidate[],
  strategy: ArbitrationStrategyId,
  prompt: string
): AICandidate[] {
  const scored = scoreCandidates(candidates, prompt);
  if (strategy === "ALPHA") {
    return scored;
  }
  /** OMEGA: reverse weighted emphasis — still passes full gate pipeline first. */
  return [...scored].sort((a, b) => weightedScore(a) - weightedScore(b));
}

function majority(
  v: readonly ArbitrationStrategyId[]
): ArbitrationStrategyId {
  const a = v.filter((x) => x === "ALPHA").length;
  const o = v.length - a;
  return a >= o ? "ALPHA" : "OMEGA";
}

/**
 * Run transparent arbitration: three stages vote (deterministic from prompt + pool),
 * 2-of-3 picks **ALPHA** vs **OMEGA** ordering. **Does not** bypass **`scoreCandidates`**.
 */
export function runTransparentArbitration(
  candidates: AICandidate[],
  context: ArbitrationContext = {}
): TransparentArbitrationResult {
  const prompt = context.prompt ?? "";
  const runId = context.runId ?? "arbitration_local";
  const fp = poolFingerprint(candidates);

  logEvent("arbitration_start", {
    runId,
    candidateCount: candidates.length,
    promptLen: prompt.length,
  });

  const v1 = deterministicVote(`${runId}|s1|${prompt}|${fp}`);
  const vote1: ArbitrationStageVote = {
    stage: 1,
    awareness: [],
    vote: v1,
  };
  logEvent("arbitration_stage_vote", {
    runId,
    stage: 1,
    awareness: vote1.awareness,
    vote: v1,
  });

  const v2 = deterministicVote(`${runId}|s2|${prompt}|${fp}|v1=${v1}`);
  const vote2: ArbitrationStageVote = {
    stage: 2,
    awareness: [1],
    vote: v2,
  };
  logEvent("arbitration_stage_vote", {
    runId,
    stage: 2,
    awareness: vote2.awareness,
    vote: v2,
  });

  const v3 = deterministicVote(`${runId}|s3|${prompt}|${fp}|v1=${v1}|v2=${v2}`);
  const vote3: ArbitrationStageVote = {
    stage: 3,
    awareness: [1, 2],
    vote: v3,
  };
  logEvent("arbitration_stage_vote", {
    runId,
    stage: 3,
    awareness: vote3.awareness,
    vote: v3,
  });

  const voteList = [v1, v2, v3] as const;
  const winner = majority(voteList);
  const tally = {
    ALPHA: voteList.filter((x) => x === "ALPHA").length,
    OMEGA: voteList.filter((x) => x === "OMEGA").length,
  };

  logEvent("arbitration_final", {
    runId,
    winner,
    tallyAlpha: tally.ALPHA,
    tallyOmega: tally.OMEGA,
    votes: voteList,
    agentAjiFusionLines: [...BRAIN_ARBITRATION_AGENT_AJI_FUSION_LINES],
  });

  const orderedCandidates = orderForStrategy(candidates, winner, prompt);

  return {
    winner,
    votes: [vote1, vote2, vote3],
    tally,
    orderedCandidates,
  };
}
