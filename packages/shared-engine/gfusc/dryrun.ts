import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { sanitizeGFUSCSignalBundle, type GFUSCSignalBundle, type SanitizedGFUSCSignalBundle } from "./signals";
import type { GFUSCRunResult } from "./verdict";

export type GFUSCMode = "LIVE" | "DRYRUN";

export type GFUSCDryrunRecord = {
  runId: string;
  mode: "DRYRUN";
  evaluatedAtUtc: string;
  verdict: GFUSCRunResult["verdict"];
  harmIndex: number;
  triggeredVectors: GFUSCRunResult["triggeredVectors"];
  signalBundle: SanitizedGFUSCSignalBundle;
  note: string;
};

export type HandleGFUSCVerdictOptions = {
  artifactPath?: string;
  onLiveBurn?: (result: GFUSCRunResult) => never;
  warn?: (message: string) => void;
};

export type HandleGFUSCVerdictOutcome =
  | { action: "clear"; mode: GFUSCMode }
  | { action: "logged"; mode: "DRYRUN"; record: GFUSCDryrunRecord }
  | { action: "live_burn_pending"; mode: "LIVE" };

export function resolveGFUSCMode(): GFUSCMode {
  const isProd = process.env.NODE_ENV === "production";
  const isLive = process.env.GFUSC_LIVE === "true";
  const isArmed = process.env.ALCHEMIST_KILLSWITCH_ARMED === "true";
  return isProd && isLive && isArmed ? "LIVE" : "DRYRUN";
}

export function handleGFUSCVerdict(
  result: GFUSCRunResult,
  signalBundle: GFUSCSignalBundle,
  options: HandleGFUSCVerdictOptions = {},
): HandleGFUSCVerdictOutcome {
  const mode = resolveGFUSCMode();
  if (result.verdict === "CLEAR") {
    return { action: "clear", mode };
  }

  if (mode === "LIVE") {
    if (options.onLiveBurn) {
      options.onLiveBurn(result);
    }
    return { action: "live_burn_pending", mode };
  }

  const record = appendGFUSCDryrunRecord(result, signalBundle, options.artifactPath);
  (options.warn ?? console.warn)(
    `[gfusc] DRYRUN burn condition — vectors=${record.triggeredVectors.join(",") || "none"} harmIndex=${record.harmIndex}`,
  );
  return { action: "logged", mode, record };
}

export function appendGFUSCDryrunRecord(
  result: GFUSCRunResult,
  signalBundle: GFUSCSignalBundle,
  artifactPath = getDefaultGFUSCDryrunPath(),
): GFUSCDryrunRecord {
  mkdirSync(dirname(artifactPath), { recursive: true });
  const record: GFUSCDryrunRecord = {
    runId: `${result.scenarioId}:${result.evaluatedAtUtc}`,
    mode: "DRYRUN",
    evaluatedAtUtc: result.evaluatedAtUtc,
    verdict: result.verdict,
    harmIndex: result.harmIndex,
    triggeredVectors: result.triggeredVectors,
    signalBundle: sanitizeGFUSCSignalBundle(signalBundle),
    note: "Killswitch not fired — dryrun mode",
  };
  appendFileSync(artifactPath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

function getDefaultGFUSCDryrunPath(): string {
  const root = findMonorepoRoot(dirname(fileURLToPath(import.meta.url)));
  return join(root, "artifacts", "gfusc-dryrun-log.jsonl");
}

function findMonorepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, "pnpm-workspace.yaml");
    if (existsSync(candidate)) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}
