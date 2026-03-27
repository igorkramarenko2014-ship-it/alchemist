import { describe, expect, it } from "vitest";
import { generate117Skills } from "../initiator/skills-117";

describe("skills-117 generator", () => {
  it("produces exactly 117 advisory skills from 17 facts", () => {
    const facts = Array.from({ length: 17 }, (_, i) => `fact_${i + 1}`);
    const skills = generate117Skills(facts);
    expect(skills).toHaveLength(117);
    expect(skills.every((s) => s.advisoryOnly)).toBe(true);
    expect(skills[116].title.toLowerCase()).toContain("skill 117");
    expect(skills[116].behaviorRule.toLowerCase()).toContain("never override");
  });
});

