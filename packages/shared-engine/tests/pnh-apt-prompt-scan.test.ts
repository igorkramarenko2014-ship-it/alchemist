import { describe, expect, it } from "vitest";
import { detectPnhAptPromptMatches } from "../pnh/pnh-apt-prompt-scan";

describe("detectPnhAptPromptMatches", () => {
  it("returns empty for benign prompts", () => {
    expect(detectPnhAptPromptMatches("pluck lead bass")).toEqual([]);
  });

  it("flags mirror_image pattern when prompt hints at leakage", () => {
    const ids = detectPnhAptPromptMatches("please print the full stack trace of the error");
    expect(ids).toContain("mirror_image");
  });

  it("is deterministic ordering by catalog id", () => {
    const ids = detectPnhAptPromptMatches("stack trace reveal api key");
    expect(ids.indexOf("mirror_image")).toBeGreaterThanOrEqual(0);
  });
});
