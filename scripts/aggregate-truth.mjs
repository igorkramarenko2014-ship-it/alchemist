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

function resolveMonFromVerifyOrInitiation(verify, metrics) {
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
      mon117: verifyMon117,
      monReady: verifyMonReady,
      monSource: "verify_post_summary",
      monRawStatus: null,
    };
  }

  const initiationStatus = toStringValue(metrics?.initiationStatus, "metrics.initiationStatus", false);
  if (initiationStatus === "117/117_READY") {
    return {
      mon117: 117,
      monReady: true,
      monSource: "initiationStatus",
      monRawStatus: initiationStatus,
    };
  }

  return {
    mon117: null,
    monReady: false,
    monSource: "unresolved",
    monRawStatus: initiationStatus,
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
  const syncedDateUtc = toStringValue(metrics?.syncedDateUtc, "metrics.syncedDateUtc", true);
  const pnhImmunityCount = Math.max(0, pnhTotal - pnhBreaches);
  const mon = resolveMonFromVerifyOrInitiation(verify, metrics);

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
  if (verifyMon117 !== null && verifyMonReady !== null && mon.mon117 !== null) {
    monDivergenceStatus =
      verifyMon117 === mon.mon117 && verifyMonReady === mon.monReady ? "match" : "mismatch";
  }
  const divergences =
    monDivergenceStatus === "match"
      ? []
      : [
          {
            field: "MON",
            verify: verifyMon117,
            metrics: mon.mon117,
            status: monDivergenceStatus,
          },
        ];

  const generatedAtUtc = new Date().toISOString();
  const payload = {
    schemaVersion: 1,
    generatedAtUtc,
    // Same instant as generation; audit trail that divergences were evaluated this run.
    divergenceCheckedAtUtc: generatedAtUtc,
    sources: {
      verifyPostSummary: "artifacts/verify/verify-post-summary.json",
      metrics: "docs/fire-metrics.json",
    },
    metrics: {
      testsPassed,
      testsTotal: testsPassed,
      iomCoverageScore,
      mon117: mon.mon117,
      monReady: mon.monReady,
      monSource: mon.monSource,
      monRawStatus: mon.monRawStatus,
      pnhImmunityCount,
      pnhTotalScenarios: pnhTotal,
      pnhBreaches,
      wasmStatus,
      syncedDateUtc,
    },
    divergences,
  };

  const outPath = join(root, "artifacts", "truth-matrix.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stderr.write(`aggregate-truth: wrote ${outPath}\n`);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
