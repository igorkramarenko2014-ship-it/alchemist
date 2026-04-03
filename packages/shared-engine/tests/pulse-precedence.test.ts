import { describe, expect, it } from "vitest";
import { enforcePulsePrecedenceGuard } from "../iom-pulse";

describe("iom-pulse precedence guard", () => {
  it("returns diagnostic-only advisory guard by default", () => {
    const result = enforcePulsePrecedenceGuard();

    expect(result.diagnosticOnly).toBe(true);
    expect(result.routingWritable).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("throws if diagnostic layer attempts routing mutation", () => {
    expect(() =>
      enforcePulsePrecedenceGuard({
        requestedRoutingMutation: true,
      }),
    ).toThrow(/cannot mutate routing/i);
  });

  it("throws if diagnostic layer attempts leadPersona override", () => {
    expect(() =>
      enforcePulsePrecedenceGuard({
        requestedLeadPersonaOverride: "anton",
      }),
    ).toThrow(/cannot override leadPersona/i);
  });

  it("throws if diagnostic layer attempts deferTruth override", () => {
    expect(() =>
      enforcePulsePrecedenceGuard({
        requestedTruthDeferOverride: true,
      }),
    ).toThrow(/cannot override deferTruth/i);
  });
});
