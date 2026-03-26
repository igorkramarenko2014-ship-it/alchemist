#!/usr/bin/env node
/**
 * **`pnpm health:audit`** — read the latest **`verify_post_summary`** artifact and optionally enforce
 * **release-ready** posture (strict HARD GATE slice + real WASM on disk classification).
 *
 * Env:
 * - **ALCHEMIST_RELEASE_AUDIT=1** or **ALCHEMIST_HEALTH_AUDIT_MODE=release** — exit **1** unless receipt shows
 *   **`wasmStatus: "available"`**, **`hardGateStrict: true`**, and **`hardGateSampleInitFxpPresent: true`**.
 * - Without those vars — print a short summary and exit **0** if a receipt exists, **1** if none.
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

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[health:audit] monorepo root not found\n");
  process.exit(1);
}

const candidates = [
  join(root, "artifacts", "verify", "verify-post-summary.json"),
  join(root, ".artifacts", "verify", "verify-post-summary.json"),
];

let pathUsed = null;
let data = null;
for (const p of candidates) {
  if (!existsSync(p)) continue;
  try {
    data = JSON.parse(readFileSync(p, "utf8"));
    pathUsed = p;
    break;
  } catch {
    /* try next */
  }
}

if (!data || data.event !== "verify_post_summary") {
  process.stderr.write(
    "[health:audit] no verify_post_summary JSON — run pnpm verify:harsh or pnpm harshcheck first\n",
  );
  process.exit(1);
}

const releaseMode =
  process.env.ALCHEMIST_RELEASE_AUDIT === "1" ||
  process.env.ALCHEMIST_HEALTH_AUDIT_MODE === "release";

const wasmOk = data.wasmStatus === "available";
const strictOk = data.hardGateStrict === true;
const sampleOk = data.hardGateSampleInitFxpPresent === true;
const releaseReady = Boolean(
  data.releaseReadyFromSummary === true ||
    (wasmOk && strictOk && sampleOk && data.wasmArtifactTruth === "real"),
);

const line = {
  receipt: pathUsed,
  verifyLaneLabel: data.verifyLaneLabel ?? null,
  wasmStatus: data.wasmStatus,
  hardGateStrict: data.hardGateStrict,
  hardGateSampleInitFxpPresent: data.hardGateSampleInitFxpPresent,
  wasmArtifactTruth: data.wasmArtifactTruth,
  releaseReadyFromSummary: data.releaseReadyFromSummary,
  inferredReleaseReady: releaseReady,
};

process.stderr.write(`[health:audit] ${JSON.stringify(line)}\n`);

if (!releaseMode) {
  process.exit(0);
}

if (!releaseReady) {
  process.stderr.write(
    "[health:audit] RELEASE audit failed — need wasmStatus=available, hardGateStrict=true, sample .fxp present, wasmArtifactTruth=real (run with strict offsets + real pkg/; see pnpm predeploy / harshcheck:wasm)\n",
  );
  process.exit(1);
}

process.stderr.write("[health:audit] release posture OK\n");
process.exit(0);
