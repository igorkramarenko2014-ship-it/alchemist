#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i += 1) {
    const packageJsonPath = join(dir, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        if (pkg.name === "alchemist" && Array.isArray(pkg.workspaces)) return dir;
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

function fail(message) {
  process.stderr.write(`[validate-truth-matrix] ${message}\n`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isIsoDateTime(value) {
  if (typeof value !== "string" || value.length < 10) return false;
  const ts = Date.parse(value);
  return Number.isFinite(ts);
}

function validateAgainstSchemaShape(doc) {
  assert(doc && typeof doc === "object", "truth matrix must be an object");
  assert(doc.schemaVersion === 2, "schemaVersion must be 2");
  assert(isIsoDateTime(doc.generatedAtUtc), "generatedAtUtc must be ISO datetime");
  assert(isIsoDateTime(doc.divergenceCheckedAtUtc), "divergenceCheckedAtUtc must be ISO datetime");
  assert(typeof doc.verification === "string" && doc.verification.length > 0, "verification must be non-empty");

  assert(doc.sources && typeof doc.sources === "object", "sources object missing");
  assert(typeof doc.sources.verifyPostSummary === "string", "sources.verifyPostSummary missing");
  assert(typeof doc.sources.metrics === "string", "sources.metrics missing");

  assert(doc.metrics && typeof doc.metrics === "object", "metrics object missing");
  assert(isFiniteNumber(doc.metrics.testsPassed), "metrics.testsPassed must be number");
  assert(isFiniteNumber(doc.metrics.testsTotal), "metrics.testsTotal must be number");
  assert(isFiniteNumber(doc.metrics.iomCoverageScore), "metrics.iomCoverageScore must be number");
  assert(doc.metrics.mon && typeof doc.metrics.mon === "object", "metrics.mon object missing");
  assert(isFiniteNumber(doc.metrics.mon.value), "metrics.mon.value must be number");
  assert(typeof doc.metrics.mon.ready === "boolean", "metrics.mon.ready must be boolean");
  assert(typeof doc.metrics.mon.source === "string" && doc.metrics.mon.source.length > 0, "metrics.mon.source missing");
  assert(isFiniteNumber(doc.metrics.pnhImmunityCount), "metrics.pnhImmunityCount must be number");
  assert(isFiniteNumber(doc.metrics.pnhTotalScenarios), "metrics.pnhTotalScenarios must be number");
  assert(isFiniteNumber(doc.metrics.pnhBreaches), "metrics.pnhBreaches must be number");
  assert(doc.metrics.wasmStatus === "available" || doc.metrics.wasmStatus === "unavailable", "metrics.wasmStatus invalid");
  assert(typeof doc.metrics.syncedDateUtc === "string", "metrics.syncedDateUtc must be string");

  assert(Array.isArray(doc.divergences), "divergences must be array");
}

function validateContractInvariants(doc) {
  assert(doc.metrics.testsPassed === doc.metrics.testsTotal, "testsPassed must equal testsTotal");
  assert(doc.metrics.iomCoverageScore >= 0 && doc.metrics.iomCoverageScore <= 1, "iomCoverageScore must be in [0,1]");
  assert(
    doc.metrics.pnhImmunityCount === doc.metrics.pnhTotalScenarios - doc.metrics.pnhBreaches,
    "pnhImmunityCount must equal pnhTotalScenarios - pnhBreaches",
  );
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) fail("monorepo root not found");

const schemaPath = join(root, "artifacts", "truth-matrix.schema.json");
const artifactPath = join(root, "artifacts", "truth-matrix.json");
if (!existsSync(schemaPath)) fail(`schema missing at ${schemaPath}`);
if (!existsSync(artifactPath)) fail(`artifact missing at ${artifactPath}`);

let schema;
let artifact;
try {
  schema = JSON.parse(readFileSync(schemaPath, "utf8"));
} catch {
  fail("invalid JSON schema file");
}
try {
  artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
} catch {
  fail("invalid truth-matrix artifact JSON");
}

assert(schema && typeof schema === "object", "schema file must be object");
validateAgainstSchemaShape(artifact);
validateContractInvariants(artifact);

process.stdout.write("[validate-truth-matrix] PASS\n");
