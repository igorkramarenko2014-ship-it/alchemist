#!/usr/bin/env node
/**
 * Dev helper: scan **`.cursor/skills/*/`** for **`SKILL.md`** and print paste-ready
 * **`igor-power-cells.json`** rows (§9c ethos → §9d manifest bridge). Does **not** write JSON.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
        /* ignore */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function firstLineTitle(raw) {
  for (const line of raw.split(/\r?\n/)) {
    const t = line.replace(/^#+\s*/, "").trim();
    if (t) return t.slice(0, 200);
  }
  return "";
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
  if (!root) {
    process.stderr.write("[igor-skill-promote] monorepo root not found\n");
    process.exit(1);
  }
  const skillsRoot = join(root, ".cursor", "skills");
  if (!existsSync(skillsRoot) || !statSync(skillsRoot).isDirectory()) {
    process.stderr.write(`[igor-skill-promote] missing ${skillsRoot}\n`);
    process.exit(1);
  }

  const rows = [];
  for (const name of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const skillMd = join(skillsRoot, name.name, "SKILL.md");
    if (!existsSync(skillMd)) continue;
    const raw = readFileSync(skillMd, "utf8");
    const title = firstLineTitle(raw);
    const cellId = name.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "skill_cell";
    rows.push({
      id: `cursor_skill_${cellId}`,
      responsibility: title
        ? `Cursor skill (§9c): ${title}`
        : `Cursor skill folder .cursor/skills/${name.name} — review SKILL.md`,
      artifacts: [`.cursor/skills/${name.name}/SKILL.md`],
      tuning_notes: "Paste into igor-power-cells only if you want the manifest to track this skill path; optional.",
    });
  }

  if (rows.length === 0) {
    process.stdout.write("No .cursor/skills/*/SKILL.md found.\n");
    return;
  }

  process.stdout.write("// Paste candidates (edit id / responsibility; then pnpm igor:sync):\n\n");
  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
}

main();
