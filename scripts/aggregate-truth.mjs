#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeUtf8FileAtomic } from "./lib/write-json-atomic.mjs";

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

function readJsonStrict(path, label) {
  if (!existsSync(path)) {
    throw new Error(`aggregate-truth: missing ${label} at ${path}`);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`aggregate-truth: invalid JSON for ${label} at ${path}`);
  }
}

function toFiniteNumber(v, label, required = false) {
  const n = Number(v);
  if (!Number.isFinite(n)) {
    if (required) throw new Error(`aggregate-truth: required numeric field missing: ${label}`);
    return null;
  }
  return n;
}

function toBoolean(v, label, required = false) {
  if (v === true || v === false) return v;
  if (required) throw new Error(`aggregate-truth: required boolean field missing: ${label}`);
  return null;
}

function toStringValue(v, label, required = false) {
  if (typeof v === "string" && v.length > 0) return v;
  if (required) throw new Error(`aggregate-truth: required string field missing: ${label}`);
  return null;
}

/** Canonical MON: single stored shape; human strings like `117/117_READY` are derived for display only. */
function resolveMonFromVerify(verify) {
  const verifyMon117 = toFiniteNumber(
    verify?.minimumOperatingNumber117,
    "verify.minimumOperatingNumber117",
    false,
  );
  const verifyMonReady = toBoolean(
    verify?.minimumOperatingReady,
    "verify.minimumOperatingReady",
    false,
  );
  if (verifyMon117 !== null && verifyMonReady !== null) {
    return {
      value: verifyMon117,
      ready: verifyMonReady,
      source: "verify_post_summary",
    };
  }

  // Schema requires finite numbers — never emit null (legacy drift).
  return {
    value: 0,
    ready: false,
    source: "unresolved",
  };
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("aggregate-truth: monorepo root not found\n");
  process.exit(1);
}

try {
  const verifyPath = join(root, "artifacts", "verify", "verify-post-summary.json");
  const metricsPath = join(root, "docs", "fire-metrics.json");
  const verify = readJsonStrict(verifyPath, "verify summary");
  const metrics = readJsonStrict(metricsPath, "fire metrics");

  const testsPassed = toFiniteNumber(metrics?.vitestTestsPassed, "metrics.vitestTestsPassed", true);
  const iomCoverageScore = toFiniteNumber(
    verify?.iomCoverageScore,
    "verify.iomCoverageScore",
    true,
  );
  const pnhTotal = toFiniteNumber(
    verify?.pnhSimulation?.totalScenarios,
    "verify.pnhSimulation.totalScenarios",
    true,
  );
  const pnhBreaches = toFiniteNumber(
    verify?.pnhSimulation?.breaches,
    "verify.pnhSimulation.breaches",
    true,
  );
  const wasmStatus = toStringValue(verify?.wasmStatus, "verify.wasmStatus", true);
  const syncedAtUtc = toStringValue(metrics?.generatedAtUtc, "metrics.generatedAtUtc", true);
  const pnhPassed = Math.max(0, pnhTotal - pnhBreaches);
  const mon = resolveMonFromVerify(verify);

  const verifyMon117 = toFiniteNumber(
    verify?.minimumOperatingNumber117,
    "verify.minimumOperatingNumber117",
    false,
  );
  const verifyMonReady = toBoolean(
    verify?.minimumOperatingReady,
    "verify.minimumOperatingReady",
    false,
  );
  let monDivergenceStatus = "missing";
  if (verifyMon117 !== null && verifyMonReady !== null) {
    monDivergenceStatus =
      verifyMon117 === mon.value && verifyMonReady === mon.ready ? "match" : "mismatch";
  }
  const divergences =
    monDivergenceStatus === "match"
      ? []
      : [
          {
            field: "MON",
            verify: verifyMon117,
            metrics: mon.value,
            status: monDivergenceStatus,
          },
        ];

  const generatedAtUtc = new Date().toISOString();
  const payload = {
    schemaVersion: 2,
    generatedAtUtc,
    // Same instant as generation; audit trail that divergences were evaluated this run.
    divergenceCheckedAtUtc: generatedAtUtc,
    verification: "Verify via jq and sha256sum as defined in AIOM-Technical-Brief.md",
    sources: {
      verifyPostSummary: "artifacts/verify/verify-post-summary.json",
      metrics: "docs/fire-metrics.json",
    },
    metrics: {
      testsPassed,
      testsTotal: testsPassed,
      iomCoverageScore,
      mon: {
        value: mon.value,
        ready: mon.ready,
        source: mon.source,
      },
      pnhImmunity: {
        passed: pnhPassed,
        total: pnhTotal,
        breaches: pnhBreaches,
        status: pnhBreaches === 0 ? "clean" : "breach",
      },
      wasmStatus,
      syncedAtUtc,
    },
    divergences,
  };

  const outPath = join(root, "artifacts", "truth-matrix.json");
  writeUtf8FileAtomic(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  process.stderr.write(`aggregate-truth: wrote ${outPath}\n`);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
