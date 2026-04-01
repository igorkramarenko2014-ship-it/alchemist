import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";

import { runGFUSCScenarios, executeKillswitch, type Terminator } from "../gfusc/runner";
import { GFUSC_VECTOR_IDS } from "../gfusc/vectors";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

describe("runGFUSCScenarios", () => {
  it("defines the full 17-vector taxonomy", () => {
    expect(GFUSC_VECTOR_IDS).toHaveLength(17);
  });

  it("returns CLEAR for low-signal scenarios", () => {
    const result = runGFUSCScenarios({
      scenarioId: "clear_case",
      source: "synthetic",
      vectorSignals: {
        FINANCIAL_HARM: { strength: 0.2, evidenceRefs: ["signal:a"] },
      },
      aggregateRisk: 0.1,
    });

    expect(result.verdict).toBe("CLEAR");
    expect(result.harmIndex).toBeLessThan(70);
    expect(result.triggeredVectors).toHaveLength(0);
  });

  it("burns on a high-severity threshold crossing", () => {
    const result = runGFUSCScenarios({
      scenarioId: "critical_financial",
      source: "synthetic",
      vectorSignals: {
        FINANCIAL_HARM: { strength: 1, evidenceRefs: ["signal:b"] },
      },
    });

    expect(result.verdict).toBe("BURN_CONDITION");
    expect(result.triggeredVectors).toContain("FINANCIAL_HARM");
  });

  it("burns immediately on zero-tolerance vectors", () => {
    const result = runGFUSCScenarios({
      scenarioId: "military",
      source: "synthetic",
      vectorSignals: {
        MILITARY_TARGETING: { strength: 0.01, evidenceRefs: ["signal:c"] },
      },
    });

    expect(result.verdict).toBe("BURN_CONDITION");
  });

  describe("executeKillswitch", () => {
    const ORIGINAL_ENV = { ...process.env };

    afterEach(() => {
      process.env = { ...ORIGINAL_ENV };
      vi.restoreAllMocks();
    });

    it("does nothing if mode is not LIVE", () => {
      process.env.NODE_ENV = "development";
      const result = runGFUSCScenarios({
        scenarioId: "critical",
        source: "synthetic",
        vectorSignals: { CRITICAL_INFRA: { strength: 1, evidenceRefs: [] } },
      });
      const terminator = vi.fn() as unknown as Terminator;

      executeKillswitch(result, terminator);
      expect(terminator).not.toHaveBeenCalled();
    });

    it("writes burn-state.json and exits 117 if mode is LIVE", async () => {
      process.env.NODE_ENV = "production";
      process.env.GFUSC_LIVE = "true";
      process.env.ALCHEMIST_KILLSWITCH_ARMED = "true";

      const result = {
        evaluatedAtUtc: "2026-03-31T00:00:00Z",
        scenarioId: "kill_scenario",
        harmIndex: 100,
        triggeredVectors: ["CRITICAL_INFRA"],
      } as any;

      const terminator = vi.fn() as unknown as Terminator;
      
      executeKillswitch(result, terminator);

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const [path, payloadStr] = (fs.writeFileSync as any).mock.calls[0];
      const payload = JSON.parse(payloadStr as string);

      expect(path as string).toContain("gfusc-burn-state.json");
      expect(payload.state).toBe("burned");
      expect(payload.burnedAtUtc).toBe(result.evaluatedAtUtc);
      expect(terminator).toHaveBeenCalledWith(117);
    });
  });
});
