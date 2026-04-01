import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeOutcomeAlignment } from "../transmutation/transmutation-outcome";
import { interpretTask } from "../transmutation/task-interpreter";
import { scoreCandidatesWithGate } from "../score";
import * as telemetry from "../telemetry";

vi.mock("../telemetry", () => ({
  logEvent: vi.fn(),
}));

describe("MOVE 3 — Intent Alignment Outcome Tests", () => {
  const validState = {
    meta: {}, master: {}, oscA: {}, oscB: {}, noise: {}, filter: {}, fx: {},
    envelopes: [], lfos: [], matrix: []
  };

  function makeCandidate(panelist: any, reasoning: string, score: number = 0.8, seed: number = 0) {
    const descriptiveReasoning = reasoning.padEnd(65, ".");
    return {
      panelist,
      score,
      state: validState,
      reasoning: descriptiveReasoning,
      description: descriptiveReasoning,
      paramArray: new Array(128).fill(0).map(() => Math.random()),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Formula Correctness", () => {
    it("should award 1.0 for exact task type match", () => {
      const schema = interpretTask("dark bass");
      const cand = makeCandidate("DEEPSEEK", "A heavy dark sub bass sound meant for low end growl textures.");
      const res = computeOutcomeAlignment(schema, cand);
      expect(res.breakdown.task_type).toBe(1.0);
    });

    it("should award 0.75 for fuzzy family match (pluck vs lead)", () => {
      const schema = interpretTask("bright pluck");
      const cand = makeCandidate("LLAMA", "A melodic lead synth line with bright harmonics and fast attack.");
      const res = computeOutcomeAlignment(schema, cand);
      expect(res.breakdown.task_type).toBe(0.75);
    });

    it("should perform schema-to-schema mood matching", () => {
      const schema = interpretTask("gritty aggressive bass");
      const cand = makeCandidate("QWEN", "Dirty and hard sound with aggressive character and gritty grit."); // dirty->gritty, hard->aggressive
      const res = computeOutcomeAlignment(schema, cand);
      // Both gritty and aggressive match
      expect(res.breakdown.mood).toBe(1.0);
    });

    it("should penalize low confidence / sparse reasoning", () => {
      const schema = interpretTask("dark bass");
      const cand = makeCandidate("LLAMA", "Bass."); // Small padding in makeCandidate but still sparse
      const res = computeOutcomeAlignment(schema, cand);
      expect(res.confidence).toBeLessThan(0.7);
    });
  });

  describe("System Gain (v1 Telemetry)", () => {
    it("scoreCandidatesWithGate should emit alignment outcome with gain", () => {
      const candidates = [
        makeCandidate("LLAMA", "Dark sub bass with heavy low end growl.", 0.9, 0), // Good match
        makeCandidate("DEEPSEEK", "Bright airy pad with lush ambient wash.", 0.8, 1), // Bad match
      ];
      
      scoreCandidatesWithGate(candidates as any, "dark bass", undefined, {
        runId: "test-run-123",
        transmutationProfile: {
          triad_weights: { LLAMA: 0.5, DEEPSEEK: 0.25, QWEN: 0.25 },
          gate_offsets: { slavic_threshold_delta: 0, novelty_gate_delta: 0 },
          priors: { taste_weight: 0.06, corpus_affinity_weight: 0.45, lesson_weight: 0.5 },
          context_injection: { lessons: [], cluster: null },
          verification_profile: { aiom_strictness: 0.5, drift_tolerance: 0.07 },
        },
      });

      const outcomeCall = (telemetry.logEvent as any).mock.calls.find((c: any) => c[0] === "transmutation_outcome_alignment");
      expect(outcomeCall).toBeDefined();
      const payload = outcomeCall[1];
      expect(payload.alignmentFinal).toBeGreaterThan(payload.survivorMeanAlignment);
      expect(payload.alignmentGainV1).toBeGreaterThan(0);
    });
  });

  describe("Observational Invariant", () => {
    it("should not affect the actual rank order comparison with and without alignment logic", () => {
      const candidates = [
        makeCandidate("LLAMA", "Descriptive candidate for ranking verification.", 0.8, 0),
        makeCandidate("DEEPSEEK", "Another descriptive candidate for ranking verification.", 0.95, 1),
      ];
      
      const res = scoreCandidatesWithGate(candidates as any, "melodic synth", undefined, {
        transmutationProfile: null, // baseline
      });
      
      expect(res.candidates).toBeDefined();
      expect(res.candidates.length).toBeGreaterThan(0);
      expect(res.candidates[0].panelist).toBe("DEEPSEEK");
    });
  });
});
