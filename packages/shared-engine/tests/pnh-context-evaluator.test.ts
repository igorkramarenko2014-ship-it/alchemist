import { describe, expect, it } from "vitest";
import { evaluatePnhContext, pnhContextFragilityScore } from "../pnh/pnh-context-evaluator";

describe("evaluatePnhContext", () => {
  it("fully live + wasm real → lower fragility than stub + schisms", () => {
    const safe = evaluatePnhContext({
      triadParityMode: "fully_live",
      triadFullyLive: true,
      wasmReal: true,
      iomSchismCount: 0,
    });
    const rough = evaluatePnhContext({
      triadParityMode: "stub",
      triadFullyLive: false,
      wasmReal: false,
      iomSchismCount: 4,
      pnhRepeatTriggersSession: 5,
      verifyMode: "selective",
    });
    expect(pnhContextFragilityScore({ triadFullyLive: true, wasmReal: true })).toBeLessThan(
      pnhContextFragilityScore({
        triadFullyLive: false,
        wasmReal: false,
        iomSchismCount: 4,
        pnhRepeatTriggersSession: 5,
      }),
    );
    expect(safe.riskLevel).not.toBe("critical");
    expect(rough.environment).toMatch(/uncertain|hostile/);
  });

  it("returns low/safe baseline when inputs sparse", () => {
    const e = evaluatePnhContext({});
    expect(e.riskLevel).toBe("low");
    expect(e.environment).toBe("safe");
  });
});
