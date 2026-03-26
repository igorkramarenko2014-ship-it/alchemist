import { describe, expect, it } from "vitest";
import { PANELIST_DNA_SEED, PANELIST_SYSTEM_PROMPTS } from "../triad-panelist-system-prompt";

describe("triad-panelist-dna — MOVE 1 Panelist DNA", () => {
  it("each panelist has a distinct non-empty system prompt", () => {
    const prompts = Object.values(PANELIST_SYSTEM_PROMPTS);
    const unique = new Set(prompts);
    expect(unique.size).toBe(3);
    prompts.forEach((p) => expect(p.length).toBeGreaterThan(100));
  });

  it("no panelist prompt contains DSP/plugin claims", () => {
    const forbidden = ["saturator", "biquad", "AU plugin", "VST binary"];
    Object.values(PANELIST_SYSTEM_PROMPTS).forEach((p) => {
      forbidden.forEach((f) => expect(p).not.toContain(f));
    });
  });

  it("codename + wire id markers present per panelist", () => {
    expect(PANELIST_DNA_SEED.DEEPSEEK).toMatch(/Harmonic architecture/i);
    expect(PANELIST_DNA_SEED.LLAMA).toMatch(/Rhythmic movement/i);
    expect(PANELIST_DNA_SEED.QWEN).toMatch(/Timbral texture/i);
    expect(PANELIST_SYSTEM_PROMPTS.DEEPSEEK).toMatch(/ATHENA.*DEEPSEEK/s);
    expect(PANELIST_SYSTEM_PROMPTS.LLAMA).toMatch(/HERMES.*LLAMA/s);
    expect(PANELIST_SYSTEM_PROMPTS.QWEN).toMatch(/HESTIA.*QWEN/s);
  });
});

