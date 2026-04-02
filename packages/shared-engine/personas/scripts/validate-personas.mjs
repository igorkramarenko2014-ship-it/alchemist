#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 24; i += 1) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const pkg = JSON.parse(readFileSync(pj, "utf8"));
        if (pkg.name === "alchemist" && Array.isArray(pkg.workspaces)) return dir;
      } catch { /* ignore */ }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function collectJsonFilesRecursive(dir, out, monorepoRoot, errors) {
  if (!existsSync(dir)) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    errors.push({
      file: relative(monorepoRoot, dir) || ".",
      path: "",
      message: `unreadable directory: ${e?.message ?? e}`,
    });
    return;
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      collectJsonFilesRecursive(p, out, monorepoRoot, errors);
    } else if (extname(ent.name).toLowerCase() === ".json") {
      try {
        if (!statSync(p).isFile()) {
          errors.push({ file: relative(monorepoRoot, p), path: "", message: "not a regular file" });
        } else {
          out.push(p);
        }
      } catch (e) {
        errors.push({ file: relative(monorepoRoot, p), path: "", message: `cannot stat: ${e?.message ?? e}` });
      }
    }
  }
}

function emitResult(obj, humanErrors) {
  for (const line of humanErrors) process.stderr.write(`${line}\n`);
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.ALCHEMIST_PERSONAS_ROOT_OVERRIDE || findMonorepoRoot(here) || findMonorepoRoot(process.cwd());
if (!root) {
  emitResult({ status: "fail", errors: [{ file: "", path: "", message: "monorepo root not found" }] }, []);
  process.exit(1);
}

const personasRoot = join(root, "packages", "shared-engine", "personas");
const corpusRoot = join(personasRoot, "corpus");
const schemaPath = join(personasRoot, "schema", "persona.schema.json");

if (process.env.ALCHEMIST_DEBUG_PERSONAS) {
  process.stderr.write(`[DEBUG] root: ${root}\n`);
  process.stderr.write(`[DEBUG] personasRoot: ${personasRoot}\n`);
}

if (!existsSync(schemaPath)) {
  emitResult({ status: "fail", errors: [{ file: "", path: "", message: `schema missing at ${schemaPath}` }] }, []);
  process.exit(1);
}
if (!existsSync(corpusRoot)) {
  emitResult({ status: "fail", errors: [{ file: "", path: "", message: `corpus missing at ${corpusRoot}` }] }, []);
  process.exit(1);
}

let schema;
try {
  schema = JSON.parse(readFileSync(schemaPath, "utf8"));
} catch (e) {
  emitResult({ status: "fail", errors: [{ file: relative(root, schemaPath), path: "", message: `invalid schema JSON: ${e?.message ?? e}` }] }, []);
  process.exit(1);
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
let validate;
try {
  validate = ajv.compile(schema);
} catch (e) {
  emitResult({ status: "fail", errors: [{ file: relative(root, schemaPath), path: "", message: `schema compile failed: ${e?.message ?? e}` }] }, []);
  process.exit(1);
}

const files = [];
const errors = [];
collectJsonFilesRecursive(corpusRoot, files, root, errors);

if (process.env.ALCHEMIST_DEBUG_PERSONAS) {
  process.stderr.write(`[DEBUG] found files: ${files.length}\n`);
  for (const f of files) process.stderr.write(`[DEBUG]   - ${f}\n`);
}

if (files.length === 0 && errors.length === 0) {
  emitResult({ status: "ok", validatedFiles: 0 }, []);
  process.exit(0);
}

const parsed = [];
for (const filePath of files.sort()) {
  const rel = relative(root, filePath);
  let doc;
  try {
    doc = JSON.parse(readFileSync(filePath, "utf8"));
    parsed.push({ rel, doc });
  } catch (e) {
    errors.push({ file: rel, path: "", message: `invalid JSON: ${e?.message ?? e}` });
  }
}

const ids = new Set();
for (const { rel, doc } of parsed) {
  if (process.env.ALCHEMIST_DEBUG_PERSONAS) {
    process.stderr.write(`[DEBUG] validating: ${rel} (id: ${doc.id})\n`);
  }

  // AJV base validation
  if (!validate(doc)) {
    const errs = validate.errors ?? [];
    if (process.env.ALCHEMIST_DEBUG_PERSONAS) {
      process.stderr.write(`[DEBUG]   AJV failed: ${errs.length} errors\n`);
    }
    for (const e of errs) {
      errors.push({
        file: rel,
        path: e.instancePath || "/",
        message: `${e.message ?? "validation error"}${e.params ? ` ${JSON.stringify(e.params)}` : ""}`,
      });
    }
    continue;
  }

  if (process.env.ALCHEMIST_DEBUG_PERSONAS) {
    process.stderr.write(`[DEBUG]   AJV passed\n`);
  }

  // Cross-file unique ID
  if (ids.has(doc.id)) {
    errors.push({ file: rel, path: "/id", message: `duplicate persona id: ${doc.id}` });
  }
  ids.add(doc.id);

  // Business logic cross-checks 
  if (doc.logics.length !== 17) {
    if (process.env.ALCHEMIST_DEBUG_PERSONAS) {
      process.stderr.write(`[DEBUG]   Logics length fail: ${doc.logics.length}\n`);
    }
    errors.push({ file: rel, path: "/logics", message: `expected 17 items, got ${doc.logics.length}` });
  }
  if (doc.commands.length !== 117) {
    if (process.env.ALCHEMIST_DEBUG_PERSONAS) {
      process.stderr.write(`[DEBUG]   Commands length fail: ${doc.commands.length}\n`);
    }
    errors.push({ file: rel, path: "/commands", message: `expected 117 items, got ${doc.commands.length}` });
  }

  const logicIds = new Set(doc.logics.map(l => l.id));
  for (let i = 0; i < doc.commands.length; i++) {
    const cmd = doc.commands[i];
    if (!logicIds.has(cmd.logic)) {
      errors.push({ file: rel, path: `/commands/${i}/logic`, message: `references invalid logic id: ${cmd.logic}` });
    }
  }

  // Contrast with self-reference
  if (doc.contrastWith.includes(doc.id)) {
    errors.push({ file: rel, path: "/contrastWith", message: `cannot contrast with self: ${doc.id}` });
  }
}

if (process.env.ALCHEMIST_DEBUG_PERSONAS) {
  process.stderr.write(`[DEBUG] final errors count: ${errors.length}\n`);
}

if (errors.length > 0) {
  emitResult({ status: "fail", errors }, []);
  process.exit(1);
}

emitResult({ status: "ok", validatedFiles: files.length }, []);
process.exit(0);
