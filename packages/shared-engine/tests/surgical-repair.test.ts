import { afterEach, describe, expect, it } from "vitest";
import type { AICandidate, SerumState } from "@alchemist/shared-types";
import { getIOMHealthPulse } from "../iom-pulse";
import {
  performSurgicalRepair,
  repairAndPushToVst,
  resetSurgicalRepairStateForTests,
} from "../surgical-repair";

const emptyState = {} as SerumState;

function baseCandidate(over: Partial<AICandidate> = {}): AICandidate {
  return {
    state: emptyState,
    score: 0.5,
    reasoning: "Enough chars here.",
    panelist: "LLAMA",
    ...over,
  };
}

afterEach(() => {
  resetSurgicalRepairStateForTests();
});

describe("surgical-repair", () => {
  it("CLAMP mode clamps paramArray and score", () => {
    const c = baseCandidate({
      score: 1.2,
      paramArray: [-0.1, 0.5, 1.5],
      reasoning: "ok reason here",
    });
    const r = performSurgicalRepair(c, { mode: "CLAMP", provenance: "vitest" });
    expect(r.success).toBe(true);
    expect(r.repairedCandidate?.paramArray).toEqual([0, 0.5, 1]);
    expect(r.repairedCandidate?.score).toBe(1);
    expect(r.repairsApplied.some((x) => x.includes("clamped"))).toBe(true);
  });

  it("LOG_ONLY records would-be repairs without mutating candidate", () => {
    const c = baseCandidate({
      score: 2,
      paramArray: [0.5],
      reasoning: "ok reason here",
    });
    const r = performSurgicalRepair(c, { mode: "LOG_ONLY", provenance: "vitest" });
    expect(r.success).toBe(true);
    expect(r.repairedCandidate?.score).toBe(2);
    expect(r.repairsApplied.some((x) => x.includes("LOG_ONLY"))).toBe(true);
  });

  it("queues IOM schism when more than five repairs in one session", () => {
    const c = baseCandidate({
      paramArray: [2, 2, 2, 2, 2, 2],
      reasoning: "x",
    });
    performSurgicalRepair(c, {
      mode: "CLAMP",
      enforceReasoningMinChars: 15,
      provenance: "vitest",
    });
    const p = getIOMHealthPulse({});
    expect(p.schisms.some((s) => s.code === "VST_SURGICAL_REPAIR_HEAVY")).toBe(true);
    const p2 = getIOMHealthPulse({});
    expect(p2.schisms.some((s) => s.code === "VST_SURGICAL_REPAIR_HEAVY")).toBe(false);
  });

  it("repairAndPushToVst returns NOT_WIRED until encode path exists", async () => {
    const c = baseCandidate();
    const out = await repairAndPushToVst(c, {}, "vitest");
    expect(out.success).toBe(false);
    expect(out.schism).toBe("VST_ENCODE_PUSH_NOT_WIRED");
  });
});
