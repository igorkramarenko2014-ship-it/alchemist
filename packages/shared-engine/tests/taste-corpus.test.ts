import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AICandidate, Panelist } from "@alchemist/shared-types";
import { computeTasteAffinity } from "../learning/taste/compute-taste-affinity";
import type { TasteIndex } from "../learning/taste/taste-types";
import { scoreCandidates } from "../score";

const _dir = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PATH = join(_dir, "../learning/taste/taste-index.example.json");

function loadExampleIndex(): TasteIndex {
  const raw = readFileSync(EXAMPLE_PATH, "utf8");
  return JSON.parse(raw) as TasteIndex;
}

function cand(panelist: Panelist, score: number, reasoning: string, extra?: Partial<AICandidate>): AICandidate {
  return {
    state: {
      meta: {},
      master: {},
      oscA: {},
      oscB: {},
      noise: {},
      filter: {},
      envelopes: [],
      lfos: [],
      fx: {},
      matrix: [],
    },
    score,
    reasoning,
    panelist,
    ...extra,
  };
}

describe("computeTasteAffinity", () => {
  const index = loadExampleIndex();

  it("returns score in [0,1] for representative texts", () => {
    const samples = [
      "Dark moody driven mid-tempo aggressive patch with distorted filter.",
      "Bright euphoric happy dance pop sparkle major chords 128 bpm.",
      "Acoustic unplugged intimate folk strings singer songwriter mellow.",
      "Instrumental techno no vocals wordless driving 140 bpm.",
      "Neutral preset description for testing bounds.",
      "Dark brooding energy with low valence and heavy saturation.",
    ];
    for (const text of samples) {
      const r = computeTasteAffinity(cand("LLAMA", 0.7, text), index);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
      expect(r.effectiveWeight).toBe(0.06);
    }
  });

  it("ranks dark/driven higher than bright/acoustic on composite (operator bias)", () => {
    const dark = computeTasteAffinity(
      cand("DEEPSEEK", 0.5, "Dark moody aggressive driven mid-tempo brooding low valence heavy patch."),
      index,
    );
    const bright = computeTasteAffinity(
      cand("QWEN", 0.5, "Bright euphoric acoustic unplugged intimate happy major uplifting airy."),
      index,
    );
    expect(dark.score).toBeGreaterThan(bright.score);
  });

  it("surfaces dark_alt_rock for matching dark alternative signals", () => {
    const r = computeTasteAffinity(
      cand(
        "LLAMA",
        0.6,
        "Dark alternative moody post-grunge energy aggressive mid-tempo low valence saturated.",
      ),
      index,
    );
    expect(r.dominantCluster).toBe("dark_alt_rock");
  });

  it("applies globalBias acoustic penalty when acousticness is high", () => {
    const withPenalty = computeTasteAffinity(
      cand("LLAMA", 0.5, "Acoustic unplugged intimate strings folk high acousticness soft warm."),
      index,
    );
    const neutral = computeTasteAffinity(
      cand("LLAMA", 0.5, "Synthetic wavetable digital fm mid energy balanced."),
      index,
    );
    expect(withPenalty.score).toBeLessThan(neutral.score);
  });

  it("example index validates JSON parse and schema-relevant shape", () => {
    expect(index.schemaVersion).toBe("1.0");
    expect(index.tasteClusters).toHaveLength(6);
    expect(index.tasteClusters.some((c) => c.id === "dark_alt_rock")).toBe(true);
  });
});

describe("scoreCandidates + tastePrior", () => {
  const index = loadExampleIndex();

  it("taste nudge cannot flip order when base-score gap exceeds nudgeWeight", () => {
    const hi = cand("LLAMA", 0.57, "Bright euphoric pop dance sparkle happy major airy club.");
    const lo = cand("QWEN", 0.5, "Dark moody brooding aggressive driven low valence heavy saturated.");
    const out = scoreCandidates([hi, lo], "test prompt", undefined, {
      tastePrior: true,
      tasteIndex: index,
      tasteWeight: 0.06,
    });
    expect(out[0]?.panelist).toBe("LLAMA");
  });

  it("tastePrior false matches omitting taste options (order with tied weighting)", () => {
    const a = cand("LLAMA", 0.8, "x".repeat(24));
    const b = cand("QWEN", 0.7, "y".repeat(24));
    const withTaste = scoreCandidates([a, b], "p", undefined, {
      tastePrior: false,
      tasteIndex: index,
    });
    const plain = scoreCandidates([a, b], "p", undefined);
    expect(withTaste.map((c) => c.panelist)).toEqual(plain.map((c) => c.panelist));
  });
});
