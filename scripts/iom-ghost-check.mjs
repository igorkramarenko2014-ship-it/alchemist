/**
 * IOM ghost-module check: warn when a TypeScript module under `packages/shared-engine/`
 * is not referenced by any power cell `artifacts[]` entry in `igor-power-cells.json`.
 *
 * Contract:
 * - Runs locally (pre-commit / optional) — it must not delete or mutate repo state.
 * - Default behavior: prints warnings and exits 0.
 * - Strict mode: set `IOM_GHOST_CHECK_STRICT=1` to exit 1 when ghosts exist.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

function parseEnvBool(name) {
  return process.env[name] === "1" || process.env[name] === "true";
}

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 12; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8"));
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        /* ignore */
      }
    }
    const parent = dir.substring(0, dir.lastIndexOf("/"));
    if (!parent || parent === dir) break;
    dir = parent;
  }
  return null;
}

function walkTsFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length > 0) {
    const d = stack.pop();
    const ents = readdirSync(d, { withFileTypes: true });
    for (const ent of ents) {
      const p = join(d, ent.name);
      if (ent.isDirectory()) {
        if (p.includes(`${dir}/tests`) || p.includes(`${dir}\\tests`)) continue;
        stack.push(p);
        continue;
      }
      if (!ent.isFile()) continue;
      if (!p.endsWith(".ts")) continue;
      if (p.endsWith(".gen.ts")) continue;
      out.push(p);
    }
  }
  return out;
}

function stableShortHash(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 10);
}

const strict = parseEnvBool("IOM_GHOST_CHECK_STRICT");

const here = fileURLToPath(import.meta.url);
const startDir = resolve(join(here, "..", ".."));
const root = findMonorepoRoot(startDir);
if (!root) {
  process.stderr.write("[iom:ghost] monorepo root not found\n");
  process.exit(1);
}

const sharedEngineDir = join(root, "packages", "shared-engine");
const powerCellsPath = join(sharedEngineDir, "igor-power-cells.json");
if (!existsSync(powerCellsPath)) {
  process.stderr.write("[iom:ghost] igor-power-cells.json missing\n");
  process.exit(1);
}

const cells = JSON.parse(readFileSync(powerCellsPath, "utf8"));
if (!Array.isArray(cells)) {
  process.stderr.write("[iom:ghost] igor-power-cells.json not an array\n");
  process.exit(1);
}

const artifacts = new Set();
for (const c of cells) {
  const arr = Array.isArray(c.artifacts) ? c.artifacts : [];
  for (const a of arr) {
    // artifacts are relative to `packages/shared-engine/` in practice
    const abs = resolve(sharedEngineDir, a);
    if (!abs.startsWith(sharedEngineDir + "/") && !abs.startsWith(sharedEngineDir + "\\")) continue;
    const rel = relative(sharedEngineDir, abs).split("\\").join("/");
    artifacts.add(rel);
  }
}

const allModules = walkTsFiles(sharedEngineDir).map((abs) =>
  relative(sharedEngineDir, abs).split("\\").join("/")
);

const ghosts = allModules.filter((rel) => !artifacts.has(rel));

const ghostCount = ghosts.length;
const fingerprint = stableShortHash(ghosts.join("|"));

if (ghostCount === 0) {
  process.stdout.write("[iom:ghost] ok — no unregistered shared-engine modules\n");
  process.exit(0);
}

process.stdout.write(
  `[iom:ghost] warning — ${ghostCount} shared-engine module(s) not referenced by any power-cell artifacts (fingerprint=${fingerprint})\n`
);

const preview = ghosts.slice(0, 25);
for (const g of preview) {
  process.stdout.write(`  - ${g}\n`);
}
if (ghostCount > preview.length) {
  process.stdout.write(`  … ${ghostCount - preview.length} more\n`);
}

if (strict) {
  process.exit(1);
}
process.exit(0);

