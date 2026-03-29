#!/usr/bin/env node
/**
 * Fail-closed validation: every *.json under learning/corpus/ (recursive) vs lesson.schema.json.
 *
 * Machine-readable contract on stdout (single JSON line):
 *   {"status":"ok","validatedFiles":N,"schemaVersion":"1.2","minLessons":M}
 *   {"status":"fail","errors":[{"file":"...","path":"...","message":"..."}],...}
 *
 * Human detail also on stderr. Exit 0 only when status ok.
 *
 * Env:
 *   LEARNING_CORPUS_MIN_LESSONS — default 1
 *   LEARNING_CORPUS_SKIP_FS_CLEAN_CHECK=1 — skip “only lesson *.json / optional *.md / .gitkeep under corpus/” (emergency only)
 *   LEARNING_CORPUS_NO_AUTO_SANITIZE=1 — if FS check finds junk under corpus/, do not run learning-forget-presets (fail closed; tests/debug)
 *
 * Cross-checks (after AJV): priorityMappingKeys ⊆ mappings keys; contrastWith.lessonId exists
 * in corpus and ≠ this lesson id; contrastMatrix.vs same; antiPatterns[].relatedTo ⊆ mappings keys;
 * duplicate lesson ids fail.
 *
 * Usage (repo root):
 *   node scripts/validate-learning-corpus.mjs
 *   pnpm learning:verify
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
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

/** Corpus durable surface: lesson JSON, optional human notes, gitkeep — nothing else. */
function isAllowedCorpusPath(filePath) {
  const base = basename(filePath);
  if (base === ".gitkeep") return true;
  const ext = extname(filePath).toLowerCase();
  return ext === ".json" || ext === ".md";
}

function collectAllCorpusFilesRecursive(dir, out) {
  if (!existsSync(dir)) return;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) collectAllCorpusFilesRecursive(p, out);
    else {
      try {
        if (statSync(p).isFile()) out.push(p);
      } catch {
        /* ignore */
      }
    }
  }
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

if (process.env.LEARNING_CORPUS_SKIP_FS_CLEAN_CHECK !== "1") {
  const allCorpusFiles = [];
  collectAllCorpusFilesRecursive(corpusRoot, allCorpusFiles);
  let forbidden = allCorpusFiles.filter((p) => !isAllowedCorpusPath(p));
  if (
    forbidden.length > 0 &&
    process.env.LEARNING_CORPUS_NO_AUTO_SANITIZE !== "1"
  ) {
    const forgetScript = join(root, "scripts", "learning-forget-presets.mjs");
    process.stderr.write(
      "[validate-learning-corpus] non-lesson file(s) under corpus/ — running scripts/learning-forget-presets.mjs once\n",
    );
    const r = spawnSync(process.execPath, [forgetScript], { cwd: root, stdio: "inherit" });
    if (r.status !== 0) {
      emitResult(
        {
          status: "fail",
          errors: [
            {
              file: relative(root, corpusRoot) || "corpus/",
              path: "",
              message: `learning-forget-presets exited ${r.status ?? "unknown"} — fix corpus/ or run pnpm learning:sanitize`,
            },
          ],
          schemaVersion: "1.2",
          minLessons: 1,
          scannedFiles: 0,
        },
        [],
      );
      process.exit(1);
    }
    const allCorpusFilesAfter = [];
    collectAllCorpusFilesRecursive(corpusRoot, allCorpusFilesAfter);
    forbidden = allCorpusFilesAfter.filter((p) => !isAllowedCorpusPath(p));
  }
  if (forbidden.length > 0) {
    const preview = forbidden.slice(0, 12);
    for (const p of preview) {
      process.stderr.write(`[validate-learning-corpus] forbidden under corpus/: ${relative(root, p)}\n`);
    }
    if (forbidden.length > preview.length) {
      process.stderr.write(`[validate-learning-corpus] … and ${forbidden.length - preview.length} more\n`);
    }
    process.stderr.write(
      "[validate-learning-corpus] corpus must contain only *.json, optional *.md, and .gitkeep — run: pnpm learning:forget-presets\n",
    );
    emitResult(
      {
        status: "fail",
        errors: [
          {
            file: relative(root, forbidden[0]) ?? "corpus/",
            path: "",
            message: `${forbidden.length} non-lesson file(s) under corpus/ — run pnpm learning:forget-presets (or pnpm learning:sanitize)`,
          },
        ],
        schemaVersion: "1.2",
        minLessons: 1,
        scannedFiles: 0,
      },
      [],
    );
    process.exit(1);
  }
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
if (declaredSchemaVersion !== "1.2") {
  emitResult(
    {
      status: "fail",
      errors: [
        {
          file: relative(root, schemaPath),
          path: "/x-alchemist-schema-version",
          message: `expected x-alchemist-schema-version "1.2", got ${JSON.stringify(declaredSchemaVersion)}`,
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

const parsed = [];
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
  parsed.push({ rel, doc });
}

/** @type {Map<string, string>} id → first file path */
const idToFile = new Map();
for (const { rel, doc } of parsed) {
  if (typeof doc.id !== "string" || !doc.id.trim()) {
    errors.push({ file: rel, path: "/id", message: "missing or empty id" });
    continue;
  }
  const id = doc.id.trim();
  if (idToFile.has(id)) {
    errors.push({
      file: rel,
      path: "/id",
      message: `duplicate lesson id ${JSON.stringify(id)} (also in ${idToFile.get(id)})`,
    });
  } else {
    idToFile.set(id, rel);
  }
}

const allLessonIds = new Set(idToFile.keys());

for (const { rel, doc } of parsed) {
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

for (const { rel, doc } of parsed) {
  const mappingKeySet = new Set(Object.keys(doc.mappings ?? {}));
  const pri = doc.priorityMappingKeys;
  if (Array.isArray(pri)) {
    for (const k of pri) {
      if (typeof k !== "string" || !mappingKeySet.has(k)) {
        errors.push({
          file: rel,
          path: "/priorityMappingKeys",
          message: `each priorityMappingKeys entry must be a key of mappings; missing or unknown: ${JSON.stringify(k)}`,
        });
      }
    }
  }
  const cw = doc.contrastWith;
  if (cw && typeof cw === "object" && typeof cw.lessonId === "string") {
    if (cw.lessonId === doc.id) {
      errors.push({
        file: rel,
        path: "/contrastWith/lessonId",
        message: "contrastWith.lessonId must reference another lesson, not this lesson",
      });
    } else if (!allLessonIds.has(cw.lessonId)) {
      errors.push({
        file: rel,
        path: "/contrastWith/lessonId",
        message: `contrastWith.lessonId ${JSON.stringify(cw.lessonId)} not found among corpus lesson ids`,
      });
    }
  }
  const cm = doc.contrastMatrix;
  if (cm && typeof cm === "object" && typeof cm.vs === "string") {
    if (cm.vs === doc.id) {
      errors.push({
        file: rel,
        path: "/contrastMatrix/vs",
        message: "contrastMatrix.vs must reference another lesson, not this lesson",
      });
    } else if (!allLessonIds.has(cm.vs)) {
      errors.push({
        file: rel,
        path: "/contrastMatrix/vs",
        message: `contrastMatrix.vs ${JSON.stringify(cm.vs)} not found among corpus lesson ids`,
      });
    }
  }
  const mappingKeySetForAnti = new Set(Object.keys(doc.mappings ?? {}));
  const anti = doc.antiPatterns;
  if (Array.isArray(anti)) {
    for (let i = 0; i < anti.length; i += 1) {
      const ap = anti[i];
      if (!ap || typeof ap !== "object") continue;
      const rt = ap.relatedTo;
      if (!Array.isArray(rt)) continue;
      for (const k of rt) {
        if (typeof k !== "string" || !mappingKeySetForAnti.has(k)) {
          errors.push({
            file: rel,
            path: `/antiPatterns/${i}/relatedTo`,
            message: `each relatedTo entry must be a key of mappings; missing or unknown: ${JSON.stringify(k)}`,
          });
        }
      }
    }
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
