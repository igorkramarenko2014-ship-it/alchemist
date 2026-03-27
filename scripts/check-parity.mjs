#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

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

function toNumberOr(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("check-parity: monorepo root not found\n");
  process.exit(1);
}

const threshold = toNumberOr(process.env.PARITY_THRESHOLD, 0.1);
const cmd = spawnSync("pnpm", ["triad:parity-diff"], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env },
});

if ((cmd.status ?? 1) !== 0) {
  process.stderr.write(`check-parity: triad:parity-diff failed (exit ${(cmd.status ?? 1)})\n`);
  if (cmd.stderr) process.stderr.write(cmd.stderr);
  process.exit(cmd.status ?? 1);
}

const out = (cmd.stdout ?? "").trim();
const markerIdx = out.lastIndexOf('"event": "triad_parity_diff_report"');
let jsonPayload = out;
if (markerIdx >= 0) {
  const start = out.lastIndexOf("{", markerIdx);
  if (start >= 0) {
    jsonPayload = out.slice(start);
  }
}
let report;
try {
  report = JSON.parse(jsonPayload);
} catch {
  process.stderr.write("check-parity: could not parse triad parity JSON output\n");
  if (out.length > 0) process.stderr.write(`${out.slice(-1000)}\n`);
  process.exit(1);
}

if (report?.liveEvaluated !== true) {
  process.stderr.write(
    "check-parity: skipped — live keys/runtime unavailable (triad parity not evaluated in live mode)\n",
  );
  process.exit(0);
}

const records = Array.isArray(report.records) ? report.records : [];
const diffsPerRecord = records.map((r) => {
  const rows = Array.isArray(r?.pairwiseDiffs) ? r.pairwiseDiffs : [];
  const total = rows.reduce((acc, row) => acc + (Array.isArray(row) ? row.length : 0), 0);
  return total;
});
const maxDiffCount = diffsPerRecord.length > 0 ? Math.max(...diffsPerRecord) : 0;
const maxDiffRatio = maxDiffCount / 10; // triad-parity-report.ts SNAPSHOT_KEYS = 10

if (maxDiffRatio > threshold) {
  process.stderr.write(
    `check-parity: FAIL — maxDiffRatio=${maxDiffRatio.toFixed(3)} exceeds threshold=${threshold.toFixed(3)}\n`,
  );
  process.exit(1);
}

process.stderr.write(
  `check-parity: PASS — maxDiffRatio=${maxDiffRatio.toFixed(3)} threshold=${threshold.toFixed(3)}\n`,
);
