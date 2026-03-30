#!/usr/bin/env node
/**
 * identity:sync — Lock 7
 * Recomputes derived identity fields, validates schema + consistency,
 * and fails hard if fields are missing, inconsistent, or out of bounds.
 *
 * Only source of truth: artifacts/truth-matrix.json (committed artifact).
 * No runtime state, no shadow tracking, no data invention.
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
        // continue
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function fail(reason) {
  process.stderr.write(`[identity:sync] FAIL — ${reason}\n`);
  process.exit(1);
}

function ok(msg) {
  process.stderr.write(`[identity:sync] ${msg}\n`);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) fail("monorepo root not found");

const matrixPath = process.env.ALCHEMIST_IDENTITY_MATRIX_PATH
  ?? join(root, "artifacts", "truth-matrix.json");
if (!existsSync(matrixPath)) fail(`truth-matrix.json not found at ${matrixPath}`);

let matrix;
try {
  matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
} catch {
  fail("truth-matrix.json is not valid JSON");
}

const metrics = matrix?.metrics;
if (!metrics || typeof metrics !== "object") fail("metrics object missing from truth-matrix.json");

// ── Validate ajiStatus ────────────────────────────────────────────────────────
const aji = metrics.ajiStatus;
if (!aji || typeof aji !== "object") fail("metrics.ajiStatus missing");
if (typeof aji.activationRate !== "number") fail("metrics.ajiStatus.activationRate must be a number");
if (aji.activationRate < 0 || aji.activationRate > 1) {
  fail(`metrics.ajiStatus.activationRate out of bounds: ${aji.activationRate} (must be 0–1)`);
}
if (typeof aji.activeSessions !== "number" || aji.activeSessions < 0) {
  fail("metrics.ajiStatus.activeSessions must be a non-negative number");
}
if (aji.lastActivatedAtUtc !== null && typeof aji.lastActivatedAtUtc !== "string") {
  fail("metrics.ajiStatus.lastActivatedAtUtc must be string or null");
}
if (aji.source !== "derived") fail("metrics.ajiStatus.source must be \"derived\"");

// ── Validate identityStatus ───────────────────────────────────────────────────
const id = metrics.identityStatus;
if (!id || typeof id !== "object") fail("metrics.identityStatus missing");
if (id.integrity !== "ok" && id.integrity !== "degraded") {
  fail(`metrics.identityStatus.integrity invalid: ${id.integrity}`);
}
if (typeof id.ajiActive !== "boolean") fail("metrics.identityStatus.ajiActive must be boolean");
if (id.lastActivationAtUtc !== null && typeof id.lastActivationAtUtc !== "string") {
  fail("metrics.identityStatus.lastActivationAtUtc must be string or null");
}
if (id.consistency !== "consistent" && id.consistency !== "mismatch") {
  fail(`metrics.identityStatus.consistency invalid: ${id.consistency}`);
}
if (id.source !== "derived") fail("metrics.identityStatus.source must be \"derived\"");

// ── Cross-field consistency check ─────────────────────────────────────────────
// ajiActive must match ajiStatus.activeSessions > 0
const derivedAjiActive = aji.activeSessions > 0;
if (id.ajiActive !== derivedAjiActive) {
  fail(
    `identityStatus.ajiActive=${id.ajiActive} does not match derived value (ajiStatus.activeSessions=${aji.activeSessions})`
  );
}

// lastActivationAtUtc must match ajiStatus.lastActivatedAtUtc
if (id.lastActivationAtUtc !== aji.lastActivatedAtUtc) {
  fail(
    `identityStatus.lastActivationAtUtc mismatch: identity=${id.lastActivationAtUtc} vs aji=${aji.lastActivatedAtUtc}`
  );
}

// consistency must be computable from the data
const expectedConsistency =
  (derivedAjiActive && aji.lastActivatedAtUtc !== null) ||
  (!derivedAjiActive && aji.lastActivatedAtUtc === null)
    ? "consistent"
    : "mismatch";
if (id.consistency !== expectedConsistency) {
  fail(
    `identityStatus.consistency="${id.consistency}" but computed value is "${expectedConsistency}"`
  );
}

// integrity must follow consistency
const expectedIntegrity = expectedConsistency === "consistent" ? "ok" : "degraded";
if (id.integrity !== expectedIntegrity) {
  fail(`identityStatus.integrity="${id.integrity}" but expected "${expectedIntegrity}" based on consistency`);
}

// ── All checks passed ─────────────────────────────────────────────────────────
ok(`ajiStatus:       activationRate=${aji.activationRate}, activeSessions=${aji.activeSessions}, source=${aji.source}`);
ok(`identityStatus:  integrity=${id.integrity}, ajiActive=${id.ajiActive}, consistency=${id.consistency}, source=${id.source}`);
ok("PASS — identity fields are consistent and schema-valid");
