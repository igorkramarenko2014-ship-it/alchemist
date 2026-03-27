import { describe, expect, it } from "vitest";
import {
  ONE_SEVENTEEN_CONSTANT,
  ONE_SEVENTEEN_SKILLS,
  oneSeventeenSeed,
  registerOneSeventeenRun,
} from "../one-seventeen-skills";

describe("one-seventeen-skills", () => {
  it("loads 17 bounded skills", () => {
    expect(ONE_SEVENTEEN_CONSTANT).toBe(117);
    expect(ONE_SEVENTEEN_SKILLS).toHaveLength(17);
  });

  it("returns deterministic seed and receipt fields", () => {
    const seedA = oneSeventeenSeed("prompt", "LLAMA");
    const seedB = oneSeventeenSeed("prompt", "LLAMA");
    expect(seedA).toBe(seedB);
    const snap = registerOneSeventeenRun({
      prompt: "prompt",
      panelistAnchor: "LLAMA",
      panelistCalls: 3,
      candidatesScored: 17,
      creativeStancesApplied: 1,
      redZoneChecks: 2,
    });
    expect(snap.oneSeventeen.spirit).toBe("YNWA");
    expect(snap.oneSeventeen.pace).toBe("elite");
  });
});

