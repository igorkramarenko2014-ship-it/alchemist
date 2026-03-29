#!/usr/bin/env node
/**
 * Remove JSONL shards under artifacts/learning-telemetry/ older than N days (default 90), by filename date.
 * Usage: node scripts/learning-forget-telemetry.mjs
 * Env: LEARNING_TELEMETRY_RETENTION_DAYS=90
 */
import { existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 28; i += 1) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const pkg = JSON.parse(readFileSync(pj, "utf8"));
        if (pkg.name === "alchemist" && Array.isArray(pkg.workspaces)) return dir;
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

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[learning-forget-telemetry] monorepo root not found\n");
  process.exit(1);
}

const dir = join(root, "artifacts", "learning-telemetry");
const days = Math.max(1, Number.parseInt(process.env.LEARNING_TELEMETRY_RETENTION_DAYS ?? "90", 10) || 90);
const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
let removed = 0;

if (existsSync(dir)) {
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue;
    const day = name.slice(0, 10);
    const t = new Date(`${day}T00:00:00.000Z`).getTime();
    if (!Number.isNaN(t) && t < cutoff) {
      unlinkSync(join(dir, name));
      removed += 1;
    }
  }
}

process.stdout.write(`${JSON.stringify({ status: "ok", removed, retentionDays: days })}\n`);
