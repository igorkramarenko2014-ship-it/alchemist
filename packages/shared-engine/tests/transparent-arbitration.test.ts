import { describe, expect, it } from "vitest";
import type { AICandidate, SerumState } from "@alchemist/shared-types";
import { runTransparentArbitration } from "../arbitration/transparent-arbitration";
import { weightedScore } from "../score";

function emptyState(): SerumState {
  return {
    meta: {},
    master: {},
    oscA: {},
    oscB: {},
    noise: {},
    filter: {},
    envelopes: [],
    lfos: [],
    fx: {},
    matrix: [],
  };
}

function cand(
  panelist: AICandidate["panelist"],
  score: number,
  reasoning: string
): AICandidate {
  return { state: emptyState(), score, reasoning, panelist };
}

describe("transparent-arbitration", () => {
  it("returns three votes, tally, and majority winner", () => {
    const pool = [
      cand("DEEPSEEK", 0.9, "alpha line — transparent arbitration test reasoning."),
      cand("LLAMA", 0.5, "beta line — transparent arbitration test reasoning."),
      cand("QWEN", 0.7, "gamma line — transparent arbitration test reasoning."),
    ];
    const r = runTransparentArbitration(pool, {
      prompt: "test prompt",
      runId: "arb_test_1",
    });
    expect(r.votes).toHaveLength(3);
    expect(r.votes[0].stage).toBe(1);
    expect(r.votes[0].awareness).toEqual([]);
    expect(r.votes[1].awareness).toEqual([1]);
    expect(r.votes[2].awareness).toEqual([1, 2]);
    expect(r.tally.ALPHA + r.tally.OMEGA).toBe(3);
    expect(["ALPHA", "OMEGA"]).toContain(r.winner);
    expect(r.orderedCandidates.length).toBeGreaterThan(0);
  });

  it("is deterministic for same inputs", () => {
    const pool = [
      cand("LLAMA", 0.6, "determinism path A — arbitration test reasoning."),
      cand("QWEN", 0.4, "determinism path B — arbitration test reasoning."),
    ];
    const a = runTransparentArbitration(pool, {
      prompt: "p",
      runId: "same",
    });
    const b = runTransparentArbitration(pool, {
      prompt: "p",
      runId: "same",
    });
    expect(b.winner).toBe(a.winner);
    expect(b.votes.map((v) => v.vote)).toEqual(a.votes.map((v) => v.vote));
  });

  it("ALPHA order is descending weighted score; OMEGA is ascending among survivors", () => {
    const pool = [
      cand("DEEPSEEK", 0.95, "high score branch — arbitration ordering test reasoning."),
      cand("QWEN", 0.5, "low score branch — arbitration ordering test reasoning."),
    ];
    const r = runTransparentArbitration(pool, {
      prompt: "order_test",
      runId: "arb_order",
    });
    const ws = r.orderedCandidates.map(weightedScore);
    if (r.winner === "ALPHA") {
      for (let i = 1; i < ws.length; i++) {
        expect(ws[i - 1]).toBeGreaterThanOrEqual(ws[i]);
      }
    } else {
      for (let i = 1; i < ws.length; i++) {
        expect(ws[i - 1]).toBeLessThanOrEqual(ws[i]);
      }
    }
  });
});
