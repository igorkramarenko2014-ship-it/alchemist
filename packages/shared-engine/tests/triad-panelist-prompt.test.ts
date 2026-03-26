import { describe, expect, it } from "vitest";
import {
  PANELIST_DNA,
  PANELIST_DNA_SEED,
  panelistDnaText,
  triadPanelistSystemPrompt,
} from "../triad-panelist-prompt";

describe("triad-panelist-prompt — MOVE 1 Panelist DNA", () => {
  it("each panelist has explicit DNA seed + non-empty elaboration lines", () => {
    for (const p of ["DEEPSEEK", "LLAMA", "QWEN"] as const) {
      expect(PANELIST_DNA_SEED[p]).toMatch(/PANELIST_DNA_SEED/);
      expect(PANELIST_DNA[p].length).toBeGreaterThanOrEqual(2);
      for (const line of PANELIST_DNA[p]) {
        expect(line.trim().length).toBeGreaterThan(40);
      }
    }
  });

  it("primary creative axes are distinct per wire id (auditor-facing)", () => {
    expect(PANELIST_DNA_SEED.DEEPSEEK).toMatch(/Harmonic architecture/i);
    expect(PANELIST_DNA_SEED.LLAMA).toMatch(/Rhythmic movement/i);
    expect(PANELIST_DNA_SEED.QWEN).toMatch(/Timbral texture/i);
  });

  it("DNA blocks are pairwise distinct (low accidental overlap)", () => {
    const a = panelistDnaText("DEEPSEEK");
    const b = panelistDnaText("LLAMA");
    const c = panelistDnaText("QWEN");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(b).not.toBe(c);
  });

  it("codename + wire id markers present per panelist", () => {
    expect(panelistDnaText("DEEPSEEK")).toMatch(/ATHENA.*DEEPSEEK/s);
    expect(panelistDnaText("LLAMA")).toMatch(/HERMES.*LLAMA/s);
    expect(panelistDnaText("QWEN")).toMatch(/HESTIA.*QWEN/s);
  });

  it("full system prompt has schema contract, HARD GATE byte refusal, and no code fences in instructions", () => {
    for (const p of ["DEEPSEEK", "LLAMA", "QWEN"] as const) {
      const s = triadPanelistSystemPrompt(p);
      expect(s).toContain("128 numbers");
      expect(s).toContain("Return ONLY a raw JSON array");
      expect(s).toMatch(/Never invent Serum binary offsets|\.fxp bytes/i);
      expect(s).not.toMatch(/```/);
      expect(s).toContain(p === "DEEPSEEK" ? "DEEPSEEK" : p === "LLAMA" ? "LLAMA" : "QWEN");
    }
  });
});
