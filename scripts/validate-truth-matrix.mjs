#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

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

/**
 * JSON Schema (draft 2020-12) is authoritative for shape.
 * Invariants below catch cross-field rules the schema does not express.
 */
function validateContractInvariants(doc) {
  assert(doc.metrics.testsPassed === doc.metrics.testsTotal, "testsPassed must equal testsTotal");
  assert(doc.metrics.iomCoverageScore >= 0 && doc.metrics.iomCoverageScore <= 1, "iomCoverageScore must be in [0,1]");
  assert(
    doc.metrics.pnhImmunity.passed === doc.metrics.pnhImmunity.total - doc.metrics.pnhImmunity.breaches,
    "pnhImmunity.passed must equal pnhImmunity.total - pnhImmunity.breaches",
  );
  assert(
    (doc.metrics.pnhImmunity.breaches === 0 && doc.metrics.pnhImmunity.status === "clean") ||
      (doc.metrics.pnhImmunity.breaches > 0 && doc.metrics.pnhImmunity.status === "breach"),
    "pnhImmunity.status must match breaches",
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

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
let validate;
try {
  validate = ajv.compile(schema);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  fail(`schema compile failed: ${msg}`);
}

if (!validate(artifact)) {
  const errs = validate.errors ?? [];
  const detail = errs
    .map((e) => `${e.instancePath || "/"} ${e.message}${e.params ? ` ${JSON.stringify(e.params)}` : ""}`)
    .join("\n");
  fail(`JSON Schema validation failed:\n${detail}`);
}

validateContractInvariants(artifact);

process.stdout.write("[validate-truth-matrix] PASS\n");
