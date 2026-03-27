#!/usr/bin/env node
/**
 * Fail-closed validation: every *.json under learning/corpus/ (recursive) vs lesson.schema.json.
 *
 * Machine-readable contract on stdout (single JSON line):
 *   {"status":"ok","validatedFiles":N,"schemaVersion":"1.0","minLessons":M}
 *   {"status":"fail","errors":[{"file":"...","path":"...","message":"..."}],...}
 *
 * Human detail also on stderr. Exit 0 only when status ok.
 *
 * Env:
 *   LEARNING_CORPUS_MIN_LESSONS — default 1
 *
 * Usage (repo root):
 *   node scripts/validate-learning-corpus.mjs
 *   pnpm learning:verify
 */
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
          errors.push({
            file: relative(monorepoRoot, p),
            path: "",
            message: "not a regular file",
          });
        } else {
          out.push(p);
        }
      } catch (e) {
        errors.push({
          file: relative(monorepoRoot, p),
          path: "",
          message: `cannot stat: ${e?.message ?? e}`,
        });
      }
    }
  }
}

function emitResult(obj, humanErrors) {
  for (const line of humanErrors) process.stderr.write(`${line}\n`);
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  emitResult({ status: "fail", errors: [{ file: "", path: "", message: "monorepo root not found" }] }, []);
  process.exit(1);
}

const learningRoot = join(root, "packages", "shared-engine", "learning");
const corpusRoot = join(learningRoot, "corpus");
const schemaPath = join(learningRoot, "schema", "lesson.schema.json");

if (!existsSync(learningRoot)) {
  emitResult(
    { status: "fail", errors: [{ file: "", path: "", message: `missing ${learningRoot}` }] },
    [],
  );
  process.exit(1);
}
if (!existsSync(schemaPath)) {
  emitResult(
    { status: "fail", errors: [{ file: "", path: "", message: `schema missing at ${schemaPath}` }] },
    [],
  );
  process.exit(1);
}
if (!existsSync(corpusRoot)) {
  emitResult(
    { status: "fail", errors: [{ file: "", path: "", message: `corpus missing at ${corpusRoot}` }] },
    [],
  );
  process.exit(1);
}

let schema;
try {
  schema = JSON.parse(readFileSync(schemaPath, "utf8"));
} catch (e) {
  emitResult(
    {
      status: "fail",
      errors: [{ file: relative(root, schemaPath), path: "", message: `invalid schema JSON: ${e?.message ?? e}` }],
    },
    [],
  );
  process.exit(1);
}

const declaredSchemaVersion = schema["x-alchemist-schema-version"];
if (declaredSchemaVersion !== "1.0") {
  emitResult(
    {
      status: "fail",
      errors: [
        {
          file: relative(root, schemaPath),
          path: "/x-alchemist-schema-version",
          message: `expected x-alchemist-schema-version "1.0", got ${JSON.stringify(declaredSchemaVersion)}`,
        },
      ],
    },
    [],
  );
  process.exit(1);
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictSchema: false,
});
addFormats(ajv);
let validate;
try {
  validate = ajv.compile(schema);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  emitResult(
    {
      status: "fail",
      errors: [{ file: relative(root, schemaPath), path: "", message: `schema compile failed: ${msg}` }],
    },
    [],
  );
  process.exit(1);
}

const files = [];
/** @type {{ file: string, path: string, message: string }[]} */
const errors = [];
collectJsonFilesRecursive(corpusRoot, files, root, errors);

const minLessons = Math.max(1, Number.parseInt(process.env.LEARNING_CORPUS_MIN_LESSONS ?? "1", 10) || 1);

if (files.length < minLessons) {
  errors.push({
    file: "packages/shared-engine/learning/corpus/",
    path: "",
    message: `need at least ${minLessons} lesson JSON file(s) under corpus/ (recursive **/*.json); found ${files.length}`,
  });
}

for (const filePath of files.sort()) {
  const rel = relative(root, filePath);
  let doc;
  try {
    doc = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (e) {
    errors.push({ file: rel, path: "", message: `invalid JSON: ${e instanceof Error ? e.message : String(e)}` });
    process.stderr.write(`[validate-learning-corpus] invalid JSON: ${rel}\n`);
    continue;
  }
  if (!validate(doc)) {
    const errs = validate.errors ?? [];
    for (const e of errs) {
      errors.push({
        file: rel,
        path: e.instancePath || "/",
        message: `${e.message ?? "validation error"}${e.params ? ` ${JSON.stringify(e.params)}` : ""}`.trim(),
      });
    }
    const detail = errs.map((e) => `${e.instancePath || "/"} ${e.message}`).join("; ");
    process.stderr.write(`[validate-learning-corpus] ${rel}\n${detail}\n`);
  }
}

if (errors.length > 0) {
  for (const er of errors) {
    process.stderr.write(`[validate-learning-corpus] ${er.file} ${er.path}: ${er.message}\n`);
  }
  emitResult(
    {
      status: "fail",
      errors,
      schemaVersion: declaredSchemaVersion,
      minLessons,
      scannedFiles: files.length,
    },
    [],
  );
  process.exit(1);
}

emitResult(
  {
    status: "ok",
    validatedFiles: files.length,
    schemaVersion: declaredSchemaVersion,
    minLessons,
  },
  [],
);
process.exit(0);
