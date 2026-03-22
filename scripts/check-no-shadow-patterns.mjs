#!/usr/bin/env node
/**
 * Fails if obvious anti-FIRE tokens appear in shared-engine TypeScript sources.
 * Doc-only mentions in *.md are not scanned. Run from repo root:
 *   node scripts/check-no-shadow-patterns.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const engineDir = join(root, "packages", "shared-engine");

const PATTERNS = [
  { name: "Symbol VERDICT bypass", re: /Symbol\s*\(\s*["']VERDICT["']\s*\)/i },
  { name: "AmnesiaWrapper", re: /\bAmnesiaWrapper\b/ },
  { name: "KGB_PROTOCOL", re: /\bKGB_PROTOCOL\b/ },
  { name: "ShadowKernel class/object", re: /\bShadowKernel\b/ },
  { name: "v8.serialize wipe narrative", re: /v8\.serialize.*\b(wipe|purge|amnesia)\b/i },
];

function walkTs(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkTs(p, out);
    else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) out.push(p);
  }
}

const files = [];
walkTs(engineDir, files);

let bad = false;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const rel = relative(root, file);
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) {
      console.error(`FAIL: ${name} pattern in ${rel}`);
      bad = true;
    }
  }
}

if (bad) {
  console.error(
    "\nRemove or refactor — FIRE forbids shadow / KGB / verdict bypass. See docs/FIRE.md §I.\n"
  );
  process.exit(1);
}

console.log(`OK: scanned ${files.length} shared-engine .ts files — no shadow-pattern hits.`);
