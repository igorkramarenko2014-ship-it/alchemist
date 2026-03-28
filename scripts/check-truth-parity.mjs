#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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

function sha256Utf8(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function fail(msg) {
  process.stderr.write(`[check:truth] ${msg}\n`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) fail("monorepo root not found");

const truthDocPath = join(root, "docs", "truth-matrix.md");
if (!existsSync(truthDocPath)) fail("docs/truth-matrix.md missing");
const before = readFileSync(truthDocPath, "utf8");
const beforeHash = sha256Utf8(before);

// 1) Normative parity: generated truth matrix must match committed doc.
const regen = spawnSync(process.execPath, [join(root, "scripts", "generate-truth-matrix.mjs")], {
  cwd: root,
  encoding: "utf8",
});
if (regen.status !== 0) {
  fail(`generate-truth-matrix failed:\n${regen.stderr || regen.stdout || "unknown error"}`);
}
const after = readFileSync(truthDocPath, "utf8");
const afterHash = sha256Utf8(after);
if (beforeHash !== afterHash) {
  fail("docs/truth-matrix.md drift detected — run `pnpm truth:matrix` and commit changes");
}

// 2) Endpoint bridge must be documented.
if (!after.includes("GET /api/health/truth-matrix")) {
  fail("docs/truth-matrix.md missing live endpoint bridge `GET /api/health/truth-matrix`");
}

// 3) Optional runtime parity: when URL is provided, verify endpoint shape.
const url = process.env.ALCHEMIST_TRUTH_MATRIX_URL;
if (url) {
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  if (!res.ok) {
    fail(`runtime truth endpoint failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const hasRows = Array.isArray(json?.rows) && json.rows.length > 0;
  const hasRuntimeChecks =
    json?.runtimeChecks == null ||
    (Array.isArray(json.runtimeChecks?.checks) && json.runtimeChecks.checks.length > 0);
  const live = json?.live;
  const hasLive =
    live &&
    typeof live === "object" &&
    ["ok", "degraded", "down"].includes(live.status) &&
    typeof live.checkedAtUtc === "string" &&
    live.checks &&
    typeof live.checks === "object" &&
    ["ok", "fail"].includes(live.checks.api) &&
    ["ok", "degraded", "fail"].includes(live.checks.triad) &&
    ["ok", "fail"].includes(live.checks.wasm);
  if (!hasRows || !hasRuntimeChecks || !hasLive) {
    fail("runtime truth payload shape invalid (rows/runtimeChecks/live missing or malformed)");
  }
}

process.stdout.write("[check:truth] parity OK\n");
