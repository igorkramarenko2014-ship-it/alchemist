import { describe, it, expect, vi } from "vitest";
import { getPersonaContextAugmentation } from "../personas/persona-context";
import * as telemetry from "../telemetry";

describe("Persona Context Advisory Injection", () => {
  it("Test 1: should return null if env is off", () => {
    const res = getPersonaContextAugmentation(["svitlana_v1"], { enabled: false });
    expect(res).toBeNull();
  });

  it("Test 2: should return null if corpus is empty (or no valid personas requested)", () => {
    const res = getPersonaContextAugmentation(["non_existent_persona"], { enabled: true });
    expect(res).toBeNull();
  });

  it("Test 3: should return contextPrefix if env is on and persona is valid", () => {
    const res = getPersonaContextAugmentation(["svitlana_v1"], { enabled: true });
    expect(res).not.toBeNull();
    expect(res?.contextPrefix).toContain("[ADVISORY PERSONA CONTEXT — PYTHIAN GOVERNANCE]");
    expect(res?.activePersonas).toContain("svitlana_v1");
  });

  it("Test 4: contextPrefix should contain correct role signal", () => {
    const res = getPersonaContextAugmentation(["svitlana_v1"], { enabled: true });
    expect(res?.contextPrefix).toContain("Ethics / Human Anchor / Integrity");
  });

  it("Test 5: contextPrefix should concatenate multiple personas correctly", () => {
    const res = getPersonaContextAugmentation(["svitlana_v1", "anton_v1"], { enabled: true });
    expect(res?.contextPrefix).toContain("SVITLANA_V1");
    expect(res?.contextPrefix).toContain("ANTON_V1");
    expect(res?.activePersonas).toHaveLength(2);
  });

  it("Test 6: telemetry metadata structure validation", () => {
    const res = getPersonaContextAugmentation(["elisey_v1"], { enabled: true });
    expect(res?.activePersonas).toEqual(["elisey_v1"]);
    expect(res?.contextCharCount).toBe(res?.contextPrefix.length);
  });

  it("Test 7: triad weights unchanged (logical verification)", () => {
    // There is no code in persona-context.ts that touches weights.
    // This test ensures the function remains pure and only returns augmentation data.
    const res = getPersonaContextAugmentation(["svitlana_v1"], { enabled: true });
    expect(res).toHaveProperty("contextPrefix");
    expect(res).toHaveProperty("activePersonas");
    expect(res).toHaveProperty("contextCharCount");
    expect(res).toHaveProperty("oracleSignal");
    
    // Check that it doesn't return anything else (like weights)
    expect(Object.keys(res!)).toHaveLength(4);
  });
});
