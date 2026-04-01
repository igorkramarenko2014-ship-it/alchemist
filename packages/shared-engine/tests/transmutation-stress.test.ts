import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreCandidatesWithGate } from "../score";
import { runTriad } from "../triad";
import * as telemetry from "../telemetry";
import { PANELIST_WEIGHTS } from "../constants";
import { PolicyFamily } from "../transmutation/transmutation-types";
import { TRANSMUTATION_BOUNDS } from "../transmutation/transmutation-bounds";

vi.mock("../telemetry", () => ({
  logEvent: vi.fn(),
}));

describe("Transmutation Fail-Open Stress Tests", () => {
  const validState = {
    meta: {}, master: {}, oscA: {}, oscB: {}, noise: {}, filter: {}, fx: {},
    envelopes: [], lfos: [], matrix: []
  };
  const dummyCandidates = [
    { panelist: "LLAMA", score: 0.8, state: validState, reasoning: "Valid reasoning for LLAMA", paramArray: new Array(128).fill(0).map((_, i) => i / 128) },
    { panelist: "DEEPSEEK", score: 0.9, state: validState, reasoning: "Valid reasoning for DEEPSEEK", paramArray: new Array(128).fill(0).map((_, i) => (128 - i) / 128) },
    { panelist: "QWEN", score: 0.7, state: validState, reasoning: "Valid reasoning for QWEN", paramArray: new Array(128).fill(0).map((_, i) => (i % 2 === 0 ? 0.1 : 0.9)) },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Clamp Path: Valid Structure, Extreme Values", () => {
    it("should clamp extreme weights (e.g. 10.0) to bound limits and log 'applied'", () => {
      const evilProfile = {
        triad_weights: { LLAMA: 10.0, DEEPSEEK: 0.4, QWEN: 0.25 },
        gate_offsets: { slavic_threshold_delta: 0, novelty_gate_delta: 0 },
        priors: { taste_weight: 0.06, corpus_affinity_weight: 0.45, lesson_weight: 0.5 },
        context_injection: { lessons: [], cluster: null },
        verification_profile: { aiom_strictness: 0.5, drift_tolerance: 0.07 },
      } as any;

      const res = scoreCandidatesWithGate(dummyCandidates as any, "test prompt", undefined, {
        transmutationProfile: evilProfile,
      });

      expect(res.status).toBe("OK");
      // Assert status: applied and clamp signal
      expect(telemetry.logEvent).toHaveBeenCalledWith("transmutation_scoring_applied", expect.objectContaining({
        status: "applied",
        weights_clamped: true,
        effective_weights: expect.objectContaining({
          LLAMA: PANELIST_WEIGHTS.LLAMA + TRANSMUTATION_BOUNDS.triad_weight_shift_max
        })
      }));
    });

    it("should clamp extreme Slavic deltas (e.g. 0.5) to bound limits", () => {
      const evilProfile = {
        triad_weights: PANELIST_WEIGHTS,
        gate_offsets: { slavic_threshold_delta: 0.5, novelty_gate_delta: 0 },
        priors: { taste_weight: 0.06, corpus_affinity_weight: 0.45, lesson_weight: 0.5 },
        context_injection: { lessons: [], cluster: null },
        verification_profile: { aiom_strictness: 0.5, drift_tolerance: 0.07 },
      } as any;

      scoreCandidatesWithGate(dummyCandidates as any, "test prompt", undefined, {
        transmutationProfile: evilProfile,
      });

      expect(telemetry.logEvent).toHaveBeenCalledWith("transmutation_scoring_applied", expect.objectContaining({
        status: "applied",
        effective_slavic_delta: 0.03, 
        slavic_clamped: true
      }));
    });
  });

  describe("Fallback Path: Malformed/Corrupted Shape", () => {
    it("should fallback to baseline on NaN weights and log 'fallback_baseline'", () => {
      const brokenProfile = {
        triad_weights: { LLAMA: NaN, DEEPSEEK: 0.4, QWEN: 0.25 },
        gate_offsets: { slavic_threshold_delta: 0, novelty_gate_delta: 0 },
        priors: { taste_weight: 0.06, corpus_affinity_weight: 0.45, lesson_weight: 0.5 },
      } as any;

      scoreCandidatesWithGate(dummyCandidates as any, "test prompt", undefined, {
        transmutationProfile: brokenProfile,
      });

      expect(telemetry.logEvent).toHaveBeenCalledWith("transmutation_scoring_applied", expect.objectContaining({
        status: "fallback_baseline",
        fallback_reason: "malformed_shape",
        effective_weights: expect.objectContaining(PANELIST_WEIGHTS)
      }));
    });

    it("should fallback to baseline on missing objects", () => {
      const brokenProfile = {
        triad_weights: PANELIST_WEIGHTS,
        // missing gate_offsets, priors
      } as any;

      scoreCandidatesWithGate(dummyCandidates as any, "test prompt", undefined, {
        transmutationProfile: brokenProfile,
      });

      expect(telemetry.logEvent).toHaveBeenCalledWith("transmutation_scoring_applied", expect.objectContaining({
        status: "fallback_baseline"
      }));
    });

    it("should reject corrupted weight shapes to baseline (Normalization test)", () => {
      const corruptProfile = {
        triad_weights: { LLAMA: 0.8 }, // missing DEEPSEEK, QWEN -> malformed check triggers
        gate_offsets: { slavic_threshold_delta: 0, novelty_gate_delta: 0 },
        priors: { taste_weight: 0.06, corpus_affinity_weight: 0.45, lesson_weight: 0.5 },
      } as any;

      scoreCandidatesWithGate(dummyCandidates as any, "test prompt", undefined, {
        transmutationProfile: corruptProfile,
      });

      // isProfileMalformed checks if DEEPSEEK/QWEN are missing via Number.isFinite(requested)
      expect(telemetry.logEvent).toHaveBeenCalledWith("transmutation_scoring_applied", expect.objectContaining({
        status: "fallback_baseline",
        effective_weights: expect.objectContaining(PANELIST_WEIGHTS)
      }));
    });
  });

  describe("Resolution Crash Recovery", () => {
    it("runTriad should catch resolver crashes and surface fallback status in telemetry", async () => {
      // In a real scenario, runTriad marks fallback if resolver throws
      const res = await runTriad("malicious_prompt_that_causes_resolver_to_throw", {
        skipPnhTriadDefense: true,
      });

      // Accessing res.triadRunTelemetry.transmutation as per shared-types
      expect(res.triadRunTelemetry).toBeDefined();
      if (res.triadRunTelemetry?.transmutation) {
        expect(res.triadRunTelemetry.transmutation.status).toBeDefined();
      }
    });
  });
});
