import { afterEach, describe, expect, it, vi } from "vitest";
import type { AICandidate, SerumState } from "@alchemist/shared-types";
import { scoreCandidates } from "../score";
import * as telemetry from "../telemetry";
import { triagePolicyForFindingId } from "../pnh/pnh-triage-matrix";
import {
  consensusValidateCandidate,
  filterValid,
  getGateIntegrityFailure,
  MAX_PARAM_ARRAY_LENGTH,
  REASONING_MAX_CHARS,
  validateParamArrayStructuralIntegrity,
  validateReasoningStructure,
} from "../validate";

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

const LEGIBLE_REASONING =
  "Synthetic gate integrity test reasoning with enough letters for legibility rules here.";

function baseCand(over: Partial<AICandidate> = {}): AICandidate {
  const params = Array.from({ length: 32 }, (_, i) => ((i * 13) % 97) / 100);
  return {
    state: emptyState(),
    panelist: "DEEPSEEK",
    score: 0.85,
    reasoning: LEGIBLE_REASONING,
    paramArray: params,
    ...over,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("gate integrity — getGateIntegrityFailure", () => {
  it("rejects partial SerumState (missing required keys)", () => {
    const c = baseCand({
      state: { meta: {}, master: {} } as unknown as SerumState,
    });
    expect(getGateIntegrityFailure(c)).toBe("state_shape");
  });

  it("rejects paramArray longer than MAX_PARAM_ARRAY_LENGTH", () => {
    const c = baseCand({
      paramArray: Array.from({ length: MAX_PARAM_ARRAY_LENGTH + 1 }, () => 0.5),
    });
    expect(getGateIntegrityFailure(c)).toBe("paramArray_too_long");
  });

  it("rejects non-finite and out-of-range params", () => {
    const p = Array.from({ length: 16 }, (_, i) => i / 20);
    expect(getGateIntegrityFailure(baseCand({ paramArray: [...p.slice(0, 8), NaN] }))).toMatch(
      /^param_non_finite_/,
    );
    expect(getGateIntegrityFailure(baseCand({ paramArray: [...p.slice(0, 8), 1.01] }))).toMatch(
      /^param_out_of_range_/,
    );
  });

  it("rejects zero-variance paramArray when length >= 8", () => {
    const flat = Array.from({ length: 16 }, () => 0.42);
    expect(getGateIntegrityFailure(baseCand({ paramArray: flat }))).toBe("param_array_zero_variance");
  });

  it("allows empty paramArray (optional vector)", () => {
    const c = baseCand({ paramArray: [] });
    expect(getGateIntegrityFailure(c)).toBeNull();
  });

  it("rejects NUL-injected and short reasoning", () => {
    expect(validateReasoningStructure("short")).toBe(false);
    expect(validateReasoningStructure(`prefix\0${"a".repeat(20)}`)).toBe(false);
    expect(getGateIntegrityFailure(baseCand({ reasoning: "too short" }))).toBe("reasoning_structure");
  });

  it("rejects reasoning over REASONING_MAX_CHARS", () => {
    const long = "a".repeat(REASONING_MAX_CHARS + 1);
    expect(getGateIntegrityFailure(baseCand({ reasoning: long }))).toBe("reasoning_structure");
  });

  it("rejects invalid panelist and score bounds", () => {
    expect(getGateIntegrityFailure(baseCand({ panelist: "FAKE" as AICandidate["panelist"] }))).toBe(
      "bad_panelist",
    );
    expect(getGateIntegrityFailure(baseCand({ score: NaN }))).toBe("score_non_finite");
    expect(getGateIntegrityFailure(baseCand({ score: 1.5 }))).toBe("score_out_of_range");
  });

  it("rejects non-string description", () => {
    const c = baseCand({ description: 123 as unknown as string });
    expect(getGateIntegrityFailure(c)).toBe("description_type");
  });
});

describe("validateParamArrayStructuralIntegrity", () => {
  it("returns ok for null/undefined", () => {
    expect(validateParamArrayStructuralIntegrity(null)).toEqual({ ok: true, values: [] });
    expect(validateParamArrayStructuralIntegrity(undefined)).toEqual({ ok: true, values: [] });
  });
});

describe("consensusValidateCandidate", () => {
  it("returns gate integrity message when invalid", () => {
    const r = consensusValidateCandidate(baseCand({ score: 2 }));
    expect(r.valid).toBe(false);
    expect(r.reasoning).toContain("Gate integrity rejected");
    expect(r.reasoning).toContain("score_out_of_range");
  });

  it("returns valid when integrity passes", () => {
    const r = consensusValidateCandidate(baseCand());
    expect(r.valid).toBe(true);
    expect(r.violations).toEqual([]);
  });
});

describe("filterValid + PNH high-severity", () => {
  it("logs pnh_gate_bypass_reject for structural bypass-class failures", () => {
    const logSpy = vi.spyOn(telemetry, "logEvent").mockImplementation(() => {});
    const bad = baseCand({ paramArray: Array.from({ length: 16 }, () => 0.5) });
    const out = filterValid([bad]);
    expect(out).toHaveLength(0);
    const p = triagePolicyForFindingId("GATE_BYPASS_PAYLOAD");
    const expectedSeverity =
      p?.severity === "high" ? "high" : p?.severity === "medium" ? "medium" : "high";
    expect(logSpy).toHaveBeenCalledWith(
      "pnh_gate_bypass_reject",
      expect.objectContaining({
        scenarioId: "GATE_BYPASS_PAYLOAD",
        severity: expectedSeverity,
        reason: "param_array_zero_variance",
      }),
    );
  });

  it("does not emit high-severity PNH for reasoning_structure alone", () => {
    const logSpy = vi.spyOn(telemetry, "logEvent").mockImplementation(() => {});
    filterValid([baseCand({ reasoning: "x" })]);
    expect(logSpy).not.toHaveBeenCalledWith(
      "pnh_gate_bypass_reject",
      expect.anything(),
    );
  });
});

describe("scoreCandidates — duplicate fingerprint drop", () => {
  it("drops second identical param fingerprint for same panelist", () => {
    const logSpy = vi.spyOn(telemetry, "logEvent").mockImplementation(() => {});
    const params = Array.from({ length: 16 }, (_, i) => ((i * 7) % 90) / 100);
    const a = baseCand({ panelist: "LLAMA", paramArray: [...params] });
    const b = baseCand({ panelist: "LLAMA", paramArray: [...params], score: 0.9 });
    const ranked = scoreCandidates([a, b], "");
    expect(ranked).toHaveLength(1);
    expect(logSpy).toHaveBeenCalledWith(
      "pnh_gate_duplicate_drop",
      expect.objectContaining({
        scenarioId: "GATE_BYPASS_PAYLOAD",
        panelist: "LLAMA",
      }),
    );
  });
});
