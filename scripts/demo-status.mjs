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

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[demo-status] monorepo root not found\n");
  process.exit(1);
}

const now = new Date().toISOString();
const verify =
  readJsonMaybe(join(root, "artifacts", "verify", "verify-post-summary.json")) ??
  readJsonMaybe(join(root, ".artifacts", "verify", "verify-post-summary.json"));
const receipt = readJsonMaybe(join(root, "artifacts", "release-audit-receipt-latest.json"));

const rows = [
  ["HARD GATE", verify?.hardGateStrict === true ? "✅ strict" : "⚠️ best_effort", "verify_post_summary", now],
  ["WASM Export", verify?.wasmArtifactTruth === "real" ? "✅ real" : "❌ non-real", "assert:wasm / verify_post_summary", now],
  ["Triad Panel State", String(verify?.triadPanelistModeExpected ? "declared" : "unknown"), "verify_post_summary", now],
  ["Circuit Breaker", "wired", "packages/shared-engine/circuit-breaker.ts", now],
  ["Panelist DNA", "present", "packages/shared-engine/triad-panelist-system-prompt.ts", now],
  ["Stub Learning", "disabled", "packages/shared-engine/reality-signals-log.ts", now],
  ["PNH Immunity", receipt?.pnh?.passed ? "✅ pass" : "⚠️ unknown", "pnpm pnh:ghost -- --strict", now],
  ["Truth Matrix", receipt?.truthMatrix?.found ? "✅ generated" : "⚠️ unknown", "docs/truth-matrix.md", now],
];

const md = [
  "# Demo Status",
  "",
  "| Check | Status | Proof Source | Last Checked |",
  "|-------|--------|--------------|--------------|",
  ...rows.map((r) => `| ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} |`),
  "",
].join("\n");

const outDir = join(root, "artifacts");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "demo-status.md"), `${md}\n`, "utf8");
process.stdout.write(`[demo-status] wrote ${join(outDir, "demo-status.md")}\n`);
