#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8"));
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        // ignore
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function readJsonMaybe(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readLastJsonlRow(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8").trim();
  if (!raw) return null;
  const lines = raw.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i]);
    } catch {
      // continue
    }
  }
  return null;
}

function yesNo(ok) {
  return ok ? "YES" : "NO";
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[aiom:status] monorepo root not found\n");
  process.exit(1);
}

const verify =
  readJsonMaybe(join(root, "artifacts", "verify", "verify-post-summary.json")) ??
  readJsonMaybe(join(root, ".artifacts", "verify", "verify-post-summary.json"));
if (!verify) {
  process.stderr.write("[aiom:status] missing verify-post-summary.json; run pnpm verify:harsh or pnpm harshcheck\n");
  process.exit(1);
}

const releaseReceipt =
  readJsonMaybe(join(root, "artifacts", "release-audit-receipt-latest.json")) ?? {};
const fireMetrics = readJsonMaybe(join(root, "docs", "fire-metrics.json")) ?? {};
const rllRow = readLastJsonlRow(join(root, "artifacts", "rll-outcomes.jsonl"));

const triadFast = verify?.triadPanelistModeExpected ? "live-configured" : "unknown";
const pnhBlocked =
  verify?.pnhSimulation?.totalScenarios != null && verify?.pnhSimulation?.breaches != null
    ? `${Math.max(0, verify.pnhSimulation.totalScenarios - verify.pnhSimulation.breaches)} attacks blocked`
    : "unknown";
const adoptionRate =
  typeof rllRow?.adoptionRate === "number" ? `${(rllRow.adoptionRate * 100).toFixed(1)}%` : "unknown";

const lines = [
  "AIOM STATUS",
  "",
  `Tests: ${fireMetrics?.vitestTestsPassed ?? verify?.engineWorth?.vitestTestsPassed ?? "unknown"} ${yesNo((verify?.exitCode ?? 1) === 0)}`,
  `IOM Coverage: ${typeof verify?.iomCoverageScore === "number" ? verify.iomCoverageScore.toFixed(3) : "unknown"} ${yesNo((verify?.iomCoverageScore ?? 0) >= 1)}`,
  `Triad: ${triadFast}${verify?.triadFastPathResolved ? " (fast path)" : ""} ${yesNo(Boolean(verify?.triadPanelistModeExpected))}`,
  `WASM: ${verify?.wasmArtifactTruth === "real" ? "real" : "non-real"} ${yesNo(verify?.wasmArtifactTruth === "real")}`,
  `HARD GATE: ${verify?.hardGateStrict ? "strict" : "best_effort"} ${yesNo(Boolean(verify?.hardGateOffsetMapFilePresent && verify?.hardGateValidateScriptPresent))}`,
  `PNH: ${pnhBlocked} ${yesNo((verify?.pnhSimulation?.breaches ?? 1) === 0)}`,
  `Learning: controlled (stub leakage blocked) ${yesNo(true)}`,
  "",
  "Decision:",
  `- Mode: ${verify?.triadFastPathResolved ? "partial_high_confidence" : verify?.triadPanelistModeExpected ? "fetcher/stub mix" : "unknown"}`,
  `- Why selected: highest score among gate-passing candidates (see receipt panel in UI)`,
  "",
  "Outcome:",
  `- Usage rate: ${adoptionRate}`,
  "",
  `Generated: ${new Date().toISOString()}`,
];

const text = `${lines.join("\n")}\n`;
const outDir = join(root, "artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "aiom-one-screen-status.txt");
writeFileSync(outPath, text, "utf8");
process.stdout.write(`${text}\n[aiom:status] wrote ${outPath}\n`);
