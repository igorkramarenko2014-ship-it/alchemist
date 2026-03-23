import { describe, expect, it } from "vitest";
import { fingerprintPromptNormalized } from "../reliability/prompt-fingerprint";

describe("fingerprintPromptNormalized", () => {
  it("is stable for the same normalized string", () => {
    const a = fingerprintPromptNormalized("hello world");
    const b = fingerprintPromptNormalized("hello world");
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("differs for different strings", () => {
    expect(fingerprintPromptNormalized("a")).not.toBe(fingerprintPromptNormalized("b"));
  });
});
