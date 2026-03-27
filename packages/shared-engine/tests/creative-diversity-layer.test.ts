import { describe, expect, it } from "vitest";
import { selectCreativeStance } from "../creative-diversity-layer";

describe("creative-diversity-layer", () => {
  it("is deterministic for same prompt+panelist", () => {
    const a = selectCreativeStance("dark moving bass", "LLAMA", {
      enabled: true,
      stances: ["mirror", "constraint", "rhythm"],
      probability: 1,
    });
    const b = selectCreativeStance("dark moving bass", "LLAMA", {
      enabled: true,
      stances: ["mirror", "constraint", "rhythm"],
      probability: 1,
    });
    expect(a).toEqual(b);
  });

  it("respects disabled config", () => {
    const out = selectCreativeStance("anything", "QWEN", {
      enabled: false,
      stances: ["mirror"],
      probability: 1,
    });
    expect(out.applied).toBe(false);
    expect(out.stance).toBeNull();
  });
});

