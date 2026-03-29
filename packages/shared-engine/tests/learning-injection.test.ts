import { describe, expect, it } from "vitest";
import {
  buildLearningContext,
  ENGINE_SCHOOL_CONTEXT_ADVISORY_LINE,
  ENGINE_SCHOOL_CONTEXT_DESCRIPTIVE_LINE,
} from "../learning/build-learning-context";
import type { LearningIndex } from "../learning/lesson-types";
import { selectLessonsForPrompt } from "../learning/select-lessons-for-prompt";
import { triadPanelistSystemPrompt } from "../triad-panelist-prompt";

function idx(lessons: LearningIndex["lessons"]): LearningIndex {
  return {
    generatedAtUtc: "2026-03-27T00:00:00.000Z",
    schemaVersion: "1.2",
    lessonCount: lessons.length,
    lessons,
  };
}

describe("selectLessonsForPrompt", () => {
  it("returns [] when index.lessons is empty", () => {
    expect(selectLessonsForPrompt(idx([]), "warm bass")).toEqual([]);
  });

  it("returns [] when no lesson matches prompt", () => {
    const index = idx([
      {
        id: "a",
        style: "cold digital",
        character: "x".repeat(25),
        causalReasoning: "y".repeat(45),
        tags: ["digital"],
        mappingKeys: ["cutoff"],
      },
    ]);
    expect(selectLessonsForPrompt(index, "zzz unrelated zzz")).toEqual([]);
  });

  it("defaults to at most 2 lessons per prompt when maxLessons omitted", () => {
    const index = idx([
      {
        id: "a",
        style: "warm analog",
        character: "c1",
        causalReasoning: "r1",
        tags: ["bass"],
        mappingKeys: [],
      },
      {
        id: "b",
        style: "warm analog",
        character: "c2",
        causalReasoning: "r2",
        tags: ["bass", "thin"],
        mappingKeys: [],
      },
      {
        id: "c",
        style: "cold",
        character: "c3",
        causalReasoning: "r3",
        tags: ["bass"],
        mappingKeys: [],
      },
    ]);
    const out = selectLessonsForPrompt(index, "warm bass");
    expect(out).toHaveLength(2);
  });

  it("returns top-N by score when matches exist", () => {
    const index = idx([
      {
        id: "low",
        style: "cold",
        character: "c1",
        causalReasoning: "r1",
        tags: [],
        mappingKeys: [],
      },
      {
        id: "high",
        style: "warm analog",
        character: "c2",
        causalReasoning: "r2",
        tags: ["bass"],
        mappingKeys: ["filter"],
      },
      {
        id: "mid",
        style: "warm",
        character: "c3",
        causalReasoning: "r3",
        tags: ["bass"],
        mappingKeys: [],
      },
    ]);
    const out = selectLessonsForPrompt(index, "warm bass preset with filter", { maxLessons: 2 });
    expect(out.map((l) => l.id)).toEqual(["high", "mid"]);
  });

  it("dedupes same style with overlapping tags keeping higher score", () => {
    const index = idx([
      {
        id: "keep",
        style: "warm analog",
        character: "c1",
        causalReasoning: "r1",
        tags: ["bass", "lush"],
        mappingKeys: [],
      },
      {
        id: "drop",
        style: "warm analog",
        character: "c2",
        causalReasoning: "r2",
        tags: ["bass", "thin"],
        mappingKeys: [],
      },
    ]);
    const out = selectLessonsForPrompt(index, "warm bass lush", { maxLessons: 3 });
    expect(out.map((l) => l.id)).toEqual(["keep"]);
  });

  it("ignores stopwords-only prompt tokens for scoring", () => {
    const index = idx([
      {
        id: "x",
        style: "cold",
        character: "c".repeat(22),
        causalReasoning: "r".repeat(45),
        tags: [],
        mappingKeys: [],
      },
    ]);
    expect(selectLessonsForPrompt(index, "the and for with this that")).toEqual([]);
  });

  it("truncates character and causalReasoning at maxCharsPerLesson", () => {
    const longC = "a".repeat(200);
    const longR = "b".repeat(200);
    const index = idx([
      {
        id: "t",
        style: "warm",
        character: longC,
        causalReasoning: longR,
        tags: ["warm"],
        mappingKeys: [],
      },
    ]);
    const out = selectLessonsForPrompt(index, "warm", { maxCharsPerLesson: 10 });
    expect(out).toHaveLength(1);
    expect(out[0].character).toBe(`${"a".repeat(9)}…`);
    expect(out[0].causalReasoning).toBe(`${"b".repeat(9)}…`);
    expect(out[0].character.length).toBe(10);
  });
});

describe("buildLearningContext", () => {
  it('returns "" for empty array', () => {
    expect(buildLearningContext([])).toBe("");
  });

  it("returns sentinel lines and lesson character for non-empty input", () => {
    const block = buildLearningContext([
      {
        id: "x",
        style: "lush",
        character: "soft tail",
        causalReasoning: "slow attack",
        tags: [],
      },
    ]);
    expect(block.startsWith(ENGINE_SCHOOL_CONTEXT_ADVISORY_LINE)).toBe(true);
    expect(block).toContain(ENGINE_SCHOOL_CONTEXT_DESCRIPTIVE_LINE);
    expect(block).toContain("--- End Engine School context ---");
    expect(block).toContain("soft tail");
    expect(block).toContain("[style: lush]");
    expect(block).toContain("Causal: slow attack");
  });

  it("caps total block length by dropping lowest-priority lessons", () => {
    const lessons = [
      {
        id: "a",
        style: "s1",
        character: "x".repeat(100),
        causalReasoning: "y".repeat(100),
        tags: [],
      },
      {
        id: "b",
        style: "s2",
        character: "x".repeat(100),
        causalReasoning: "y".repeat(100),
        tags: [],
      },
    ];
    const block = buildLearningContext(lessons, { maxTotalChars: 280 });
    expect(block.length).toBeLessThanOrEqual(280);
    expect(block).not.toContain("[style: s2]");
  });
});

describe("triadPanelistSystemPrompt + learningContext", () => {
  it('with learningContext="" matches omitting opts', () => {
    const a = triadPanelistSystemPrompt("LLAMA");
    const b = triadPanelistSystemPrompt("LLAMA", { learningContext: "" });
    const c = triadPanelistSystemPrompt("LLAMA", { learningContext: "   " });
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it('with learningContext="TEST_CONTEXT" ends with that suffix', () => {
    const s = triadPanelistSystemPrompt("QWEN", { learningContext: "TEST_CONTEXT" });
    expect(s.endsWith("TEST_CONTEXT")).toBe(true);
    expect(s).toContain("\n\nTEST_CONTEXT");
  });
});
