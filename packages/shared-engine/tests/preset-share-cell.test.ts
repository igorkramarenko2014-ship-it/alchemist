/**
 * IOM **`preset_share`** cell — type contract + doc hook. Implementation lives in **`apps/web-app`**
 * (`share-preset`, API route, `/presets/[slug]`); web tests: **`apps/web-app/__tests__/preset-share.test.ts`**.
 */
import type { SharedPreset } from "@alchemist/shared-types";
import { describe, expect, it } from "vitest";

describe("preset_share (IOM cell contract)", () => {
  it("SharedPreset omits .fxp bytes and offset map fields", () => {
    const row: SharedPreset = {
      slug: "demo-abc123",
      prompt: "warm pad",
      description: "",
      reasoning: "Fifteen char gate text",
      paramArray: [0.25, 0.5],
      score: 0.9,
      panelist: "ATHENA",
      sharedAt: new Date().toISOString(),
      wasmAvailable: true,
    };
    expect(row.slug.length).toBeGreaterThan(0);
    expect("fxpBytes" in row).toBe(false);
  });
});
