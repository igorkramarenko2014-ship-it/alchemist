import { describe, expect, it, vi } from "vitest";
import type { AICandidate } from "@alchemist/shared-types";
import { sharePreset } from "../lib/share-preset";

vi.mock("@alchemist/shared-engine", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@alchemist/shared-engine")>();
  return {
    ...mod,
    logEvent: vi.fn(),
  };
});

const fullState = (): AICandidate["state"] => ({
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
});

const variedParams = (n: number) => Array.from({ length: n }, (_, i) => ((i * 17) % 100) / 100);

const baseCandidate = {
  state: fullState(),
  panelist: "DEEPSEEK" as const,
  score: 0.9,
  reasoning: "Dark growling bass with heavy sub movement and gritty texture",
  description: "Sub bass with modulated filter",
  paramArray: variedParams(128),
} as AICandidate;

describe("sharePreset", () => {
  it("returns null when score below floor", () => {
    expect(sharePreset(baseCandidate, "dark bass", 0.84, false)).toBeNull();
  });

  it("returns null when reasoning too short", () => {
    const c = { ...baseCandidate, reasoning: "too short" } as AICandidate;
    expect(sharePreset(c, "dark bass", 0.9, false)).toBeNull();
  });

  it("returns null when paramArray missing or empty", () => {
    const c = { ...baseCandidate, paramArray: [] } as AICandidate;
    expect(sharePreset(c, "dark bass", 0.9, false)).toBeNull();
  });

  it("returns SharedPreset with correct fields on valid input", () => {
    const result = sharePreset(baseCandidate, "dark growling bass", 0.92, true);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(0.92);
    expect(result!.panelist).toBe("ATHENA");
    expect(result!.slug.startsWith("dark-growling-bass-")).toBe(true);
    expect(result!.wasmAvailable).toBe(true);
  });

  it("slug is url-safe", () => {
    const result = sharePreset(baseCandidate, "Bright!! Hyperpop Lead 🔥", 0.91, false);
    expect(result).not.toBeNull();
    expect(result!.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("paramArray on SharedPreset is a copy — mutating does not affect candidate", () => {
    const c = {
      ...baseCandidate,
      paramArray: variedParams(16),
    } as AICandidate;
    const result = sharePreset(c, "test", 0.9, false);
    expect(result).not.toBeNull();
    result!.paramArray[0] = 999;
    expect(c.paramArray![0]).toBe(0.5);
  });
});
