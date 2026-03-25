#!/usr/bin/env npx tsx
/**
 * PNH War Game Runner — deterministic pre-release hostility report.
 *
 * Writes:
 *  - `tools/pnh-wargame-last.json` (gitignored)
 *
 * Prints:
 *  - JSON report to stdout (single line) for verify_post_summary integration.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getWasmArtifactTruthForSummary } from "./lib/wasm-artifact-truth.mjs";
import { getHardGateFilesTruth } from "./lib/hard-gate-files-truth.mjs";
import { runPnhWarGame, type PnhWarGameHostTruth } from "../packages/shared-engine/pnh/pnh-wargame";

function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 20; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8")) as { name?: string; workspaces?: unknown };
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        /* ignore */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function parseArgs(argv: string[]) {
  // For deterministic operator replay, we accept a minimal override mechanism.
  const envReleaseMode = process.env.ALCHEMIST_WARGAME_RELEASE_MODE;
  const releaseModeRequested =
    envReleaseMode === "0" ? false : envReleaseMode === "1" ? true : true;

  const forceWasmTruth = process.env.ALCHEMIST_WARGAME_FORCE_WASM_ARTIFACT_TRUTH;
  const forceHardGateSample = process.env.ALCHEMIST_WARGAME_FORCE_HARDGATE_SAMPLE_INIT;
  const scenarioRepeatsOverrideJson = process.env.ALCHEMIST_WARGAME_SCENARIO_REPEATS_JSON;

  let scenarioOverrides: Record<string, { repeats?: number }> | undefined;
  if (scenarioRepeatsOverrideJson && scenarioRepeatsOverrideJson.trim().length > 0) {
    try {
      const o = JSON.parse(scenarioRepeatsOverrideJson) as Record<string, { repeats?: number }>;
      scenarioOverrides = o;
    } catch {
      // ignore
    }
  }

  return { releaseModeRequested, forceWasmTruth, forceHardGateSample, scenarioOverrides };
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
  if (!root) {
    process.stderr.write("[pnh-wargame] monorepo root not found\n");
    process.exit(2);
  }

  const { releaseModeRequested, forceWasmTruth, forceHardGateSample, scenarioOverrides } =
    parseArgs(process.argv.slice(2));

  const wasmTruth = getWasmArtifactTruthForSummary(root);
  const hardGate = getHardGateFilesTruth(root);

  const hostTruth: PnhWarGameHostTruth = {
    wasmArtifactTruth: (forceWasmTruth as any) ?? wasmTruth.wasmArtifactTruth,
    wasmBrowserFxpEncodeReady: wasmTruth.wasmBrowserFxpEncodeReady,
    hardGateOffsetMapFilePresent: hardGate.hardGateOffsetMapFilePresent,
    hardGateValidateScriptPresent: hardGate.hardGateValidateScriptPresent,
    hardGateSampleInitFxpPresent:
      forceHardGateSample === "0" ? false : forceHardGateSample === "1" ? true : hardGate.hardGateSampleInitFxpPresent,
  };

  const report = runPnhWarGame(hostTruth, { releaseModeRequested, scenarioOverrides });

  const outPath = join(root, "tools", "pnh-wargame-last.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  // single-line JSON for machine parsing
  process.stdout.write(JSON.stringify(report));
}

main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + "\n");
  process.exit(1);
});

