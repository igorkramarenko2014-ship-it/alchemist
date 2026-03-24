#!/usr/bin/env node
/**
 * Compare **`tools/iom-snapshots.jsonl`** rows in a date window (ISO date prefix on **`timestamp`**).
 *
 * Usage (repo root):
 *   pnpm iom:diff -- --from 2026-03-23 --to 2026-03-24
 */
import { existsSync, readFileSync } from "node:fs";
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
        /* ignore */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function parseArgs(argv) {
  let fromD = "";
  let toD = "";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from" && argv[i + 1]) fromD = argv[++i];
    else if (a.startsWith("--from=")) fromD = a.slice("--from=".length);
    else if (a === "--to" && argv[i + 1]) toD = argv[++i];
    else if (a.startsWith("--to=")) toD = a.slice("--to=".length);
  }
  return { fromD, toD };
}

function inRange(isoTs, fromD, toD) {
  if (!isoTs || typeof isoTs !== "string") return false;
  const day = isoTs.slice(0, 10);
  if (fromD && day < fromD) return false;
  if (toD && day > toD) return false;
  return true;
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
  if (!root) {
    process.stderr.write("[iom-diff] monorepo root not found\n");
    process.exit(1);
  }
  const { fromD, toD } = parseArgs(process.argv.slice(2));
  if (!fromD || !toD) {
    process.stderr.write("Usage: pnpm iom:diff -- --from YYYY-MM-DD --to YYYY-MM-DD\n");
    process.exit(1);
  }

  const path = join(root, "tools", "iom-snapshots.jsonl");
  if (!existsSync(path)) {
    process.stderr.write(`[iom-diff] missing ${path} — run pnpm iom:snapshot first\n`);
    process.exit(1);
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  const matched = [];
  for (const line of lines) {
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (o?.kind !== "iom_snapshot_v1") continue;
    if (!inRange(o.timestamp, fromD, toD)) continue;
    matched.push(o);
  }

  const schismSet = (row) =>
    new Set((row.iomPulse?.schisms ?? []).map((s) => s.code).filter(Boolean));
  const first = matched[0];
  const last = matched[matched.length - 1];

  const out = {
    event: "iom_diff_summary",
    from: fromD,
    to: toD,
    snapshotCount: matched.length,
    firstTimestamp: first?.timestamp ?? null,
    lastTimestamp: last?.timestamp ?? null,
    firstManifestHash: first?.manifestHash ?? null,
    lastManifestHash: last?.manifestHash ?? null,
    manifestHashChanged:
      first && last ? first.manifestHash !== last.manifestHash : null,
    firstSchismCodes: first ? [...schismSet(first)].sort() : [],
    lastSchismCodes: last ? [...schismSet(last)].sort() : [],
    note: "Diagnostic diff over iom_snapshot_v1 JSONL — no mutation.",
  };

  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main();
