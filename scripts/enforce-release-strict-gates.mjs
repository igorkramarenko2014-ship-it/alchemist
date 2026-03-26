#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const raw = readFileSync(pj, "utf8");
        const j = JSON.parse(raw);
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

function changedPaths(root) {
  const mb = spawnSync("git", ["merge-base", "HEAD", "origin/main"], { cwd: root, encoding: "utf8" });
  let base = null;
  if (mb.status === 0 && mb.stdout.trim()) base = mb.stdout.trim();
  if (!base) {
    const prev = spawnSync("git", ["rev-parse", "HEAD~1"], { cwd: root, encoding: "utf8" });
    if (prev.status !== 0 || !prev.stdout.trim()) return [];
    base = prev.stdout.trim();
  }
  const d = spawnSync("git", ["diff", "--name-only", `${base}...HEAD`], {
    cwd: root,
    encoding: "utf8",
  });
  if (d.status !== 0) return [];
  return d.stdout.split(/\r?\n/).filter(Boolean);
}

function isReleaseSensitivePath(file) {
  const p = file.replace(/\\/g, "/");
  return (
    p.startsWith("packages/fxp-encoder/") ||
    p.startsWith("apps/web-app/app/api/health/wasm/") ||
    p.includes("/encoder.") ||
    p.includes("/serum-offset-map.ts") ||
    p.includes("validate-offsets.py") ||
    p.includes("scripts/predeploy-wasm.mjs") ||
    p.includes("scripts/assert-hard-gate.mjs") ||
    p.includes("scripts/assert-wasm-available.mjs")
  );
}

function runStrict(root, script, extraEnv) {
  const r = spawnSync("pnpm", [script], {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...extraEnv },
  });
  return r.status === null ? 1 : r.status;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[strict-gates] monorepo root not found\n");
  process.exit(1);
}

const changed = changedPaths(root);
const touched = changed.filter(isReleaseSensitivePath);

if (touched.length === 0) {
  process.stderr.write(
    "[strict-gates] no export/encoder-sensitive paths changed; strict WASM/OFFSETS enforcement skipped for this diff\n",
  );
  process.exit(0);
}

process.stderr.write(
  `[strict-gates] sensitive paths changed (${touched.length}) -> enforcing ALCHEMIST_STRICT_OFFSETS=1 + REQUIRE_WASM=1\n`,
);
for (const t of touched.slice(0, 20)) process.stderr.write(`  - ${t}\n`);

const hardGateCode = runStrict(root, "assert:hard-gate", { ALCHEMIST_STRICT_OFFSETS: "1" });
if (hardGateCode !== 0) process.exit(hardGateCode);

const wasmCode = runStrict(root, "assert:wasm", {
  REQUIRE_WASM: "1",
  ALCHEMIST_REQUIRE_WASM: "1",
});
process.exit(wasmCode);

