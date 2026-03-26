import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import type { AICandidate, Panelist } from "@alchemist/shared-types";
import { computeIntentAlignmentScore } from "../intent-alignment";

function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 12; i++) {
    const pkg = join(dir, "package.json");
    if (existsSync(pkg)) {
      try {
        const j = JSON.parse(readFileSync(pkg, "utf8"));
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        // ignore
      }
    }
    const parent = dir.substring(0, dir.lastIndexOf("/"));
    if (!parent || parent === dir) break;
    dir = parent;
  }
  return null;
}

function hashSha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function cand(panelist: Panelist, score: number, reasoning: string, paramArray?: number[]): AICandidate {
  return {
    state: { meta: {}, master: {}, oscA: {}, oscB: {}, noise: {}, filter: {}, envelopes: [], lfos: [], fx: {}, matrix: [] },
    score,
    reasoning,
    panelist,
    ...(paramArray !== undefined ? { paramArray } : {}),
  };
}

describe("intent alignment stats telemetry", () => {
  it("writes deterministic intent-alignment stats into artifacts/verify", () => {
    const prompt = "dark growling reese bass";
    const onTopic = cand(
      "DEEPSEEK",
      0.9,
      "This patch emphasizes a dark growling bass texture with reese harmonics.",
      Array.from({ length: 128 }, (_, i) => ((i * 17) % 100) / 100),
    );
    const offTopic = cand(
      "LLAMA",
      0.9,
      "Bright airy pluck lead with shimmer and glassy highs for edm.",
      Array.from({ length: 128 }, (_, i) => ((i * 3) % 100) / 100),
    );

    const s0 = computeIntentAlignmentScore(prompt, onTopic);
    const s1 = computeIntentAlignmentScore(prompt, offTopic);
    const mean = (s0 + s1) / 2;

    expect(s0).toBeGreaterThan(s1);
    expect(mean).toBeGreaterThan(0);

    const here = fileURLToPath(import.meta.url);
    const engineDir = here.split("/tests/")[0] ?? "";
    const root = findMonorepoRoot(engineDir);
    expect(root).not.toBeNull();

    const outDir = join(root!, "artifacts", "verify");
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, "intent-alignment-stats.json");

    writeFileSync(
      outPath,
      JSON.stringify(
        {
          schema: "alchemist.intent_alignment_stats_v1",
          promptHash: hashSha256Hex(prompt),
          sampleCount: 2,
          meanIntentAlignmentScore: mean,
          minIntentAlignmentScore: Math.min(s0, s1),
          maxIntentAlignmentScore: Math.max(s0, s1),
        },
        null,
        2,
      ),
      "utf8",
    );
  });
});

