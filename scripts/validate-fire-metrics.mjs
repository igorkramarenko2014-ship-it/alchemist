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
  process.stderr.write(`[validate-fire-metrics] ${message}\n`);
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

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isSha256Hex(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function validateShape(doc) {
  assert(doc && typeof doc === "object", "fire metrics must be an object");
  assert(doc.schemaVersion === 3, "schemaVersion must be 3");
  assert(isIsoDate(doc.syncedDateUtc), "syncedDateUtc must be YYYY-MM-DD");
  assert(isIsoDateTime(doc.generatedAtUtc), "generatedAtUtc must be ISO datetime");
  assert(isFiniteNumber(doc.vitestTestsPassed), "vitestTestsPassed must be number");
  assert(isFiniteNumber(doc.vitestTestFilesPassed), "vitestTestFilesPassed must be number");
  assert(isFiniteNumber(doc.vitestTestTsOnDisk), "vitestTestTsOnDisk must be number");
  assert(typeof doc.nextJsVersion === "string" && doc.nextJsVersion.length > 0, "nextJsVersion missing");
  assert(typeof doc.vst3BundlePresent === "boolean", "vst3BundlePresent must be boolean");
  assert(
    doc.vst3BundleBasename === null || typeof doc.vst3BundleBasename === "string",
    "vst3BundleBasename must be string|null",
  );
  assert(
    doc.vst3MainBinarySha256 === null || isSha256Hex(doc.vst3MainBinarySha256),
    "vst3MainBinarySha256 must be sha256 hex|null",
  );

  assert(doc.mon && typeof doc.mon === "object", "mon must be an object");
  assert(doc.mon.value === null || isFiniteNumber(doc.mon.value), "mon.value must be number|null");
  assert(typeof doc.mon.ready === "boolean", "mon.ready must be boolean");
  assert(typeof doc.mon.source === "string" && doc.mon.source.length > 0, "mon.source missing");
  if (doc.mon.rawStatus !== undefined) {
    assert(typeof doc.mon.rawStatus === "string", "mon.rawStatus must be string when present");
  }

  assert(
    doc.initiatorSkillsSha256 === null || isSha256Hex(doc.initiatorSkillsSha256),
    "initiatorSkillsSha256 must be sha256 hex|null",
  );
  assert(typeof doc.verification === "string" && doc.verification.length > 0, "verification must be non-empty");
  assert(Array.isArray(doc.divergences), "divergences must be array");

  const lo = doc.learningOutcomes;
  assert(lo && typeof lo === "object", "learningOutcomes must be an object");
  assert(isFiniteNumber(lo.candidateSuccessRate), "learningOutcomes.candidateSuccessRate must be number");
  assert(isFiniteNumber(lo.meanBestScoreWithLessons), "learningOutcomes.meanBestScoreWithLessons must be number");
  assert(isFiniteNumber(lo.orderChangeRate), "learningOutcomes.orderChangeRate must be number");
  assert(isFiniteNumber(lo.tasteClusterHitRate), "learningOutcomes.tasteClusterHitRate must be number");
  assert(lo.authoritative === false, "learningOutcomes.authoritative must be false");
  assert(typeof lo.note === "string" && lo.note.length > 0, "learningOutcomes.note must be non-empty string");
}

function validateInvariants(doc) {
  assert(!("initiatorManifestStatus" in doc), "initiatorManifestStatus is forbidden in canonical fire metrics");
  assert(doc.vitestTestsPassed >= 0, "vitestTestsPassed must be >= 0");
  assert(doc.vitestTestFilesPassed >= 0, "vitestTestFilesPassed must be >= 0");
  assert(doc.vitestTestTsOnDisk >= 0, "vitestTestTsOnDisk must be >= 0");
  assert(doc.vitestTestFilesPassed <= doc.vitestTestsPassed, "test files passed cannot exceed tests passed");
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) fail("monorepo root not found");

const schemaPath = join(root, "docs", "fire-metrics.schema.json");
const metricsPath = join(root, "docs", "fire-metrics.json");
if (!existsSync(schemaPath)) fail(`schema missing at ${schemaPath}`);
if (!existsSync(metricsPath)) fail(`artifact missing at ${metricsPath}`);

try {
  JSON.parse(readFileSync(schemaPath, "utf8"));
} catch {
  fail("invalid fire-metrics schema JSON");
}

let metrics;
try {
  metrics = JSON.parse(readFileSync(metricsPath, "utf8"));
} catch {
  fail("invalid fire-metrics JSON");
}

validateShape(metrics);
validateInvariants(metrics);
process.stdout.write("[validate-fire-metrics] PASS\n");
