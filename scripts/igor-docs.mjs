#!/usr/bin/env node
/**
 * Generates **`docs/iom-architecture.md`** (or `--output <path>`) from **`igor-power-cells.json`**.
 * Extended cell fields (**`thresholds`**, **`health_check`**, **`last_tuned`**, **`tuning_notes`**) are
 * rendered when present — optional metadata for living docs.
 */
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
        /* ignore */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function parseOutArg(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--output" && argv[i + 1]) return argv[i + 1];
    if (a.startsWith("--output=")) return a.slice("--output=".length);
  }
  return null;
}

function escMd(s) {
  return String(s).replace(/\|/g, "\\|");
}

function formatThresholds(t) {
  if (!t || typeof t !== "object") return "";
  const parts = Object.entries(t).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return parts.length ? parts.join(", ") : "";
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
  if (!root) {
    process.stderr.write("[igor-docs] monorepo root not found\n");
    process.exit(1);
  }

  const outRel = parseOutArg(process.argv.slice(2)) ?? "docs/iom-architecture.md";
  const cellsPath = join(root, "packages", "shared-engine", "igor-power-cells.json");
  if (!existsSync(cellsPath)) {
    process.stderr.write(`[igor-docs] missing ${cellsPath}\n`);
    process.exit(1);
  }

  const cells = JSON.parse(readFileSync(cellsPath, "utf8"));
  if (!Array.isArray(cells)) {
    process.stderr.write("[igor-docs] igor-power-cells.json: expected array\n");
    process.exit(1);
  }

  const syncIso = new Date().toISOString().slice(0, 10);
  const lines = [
    "# IOM architecture (auto-generated)",
    "",
    `Last sync: **${syncIso}** — run \`pnpm igor:docs\` to refresh after editing \`igor-power-cells.json\`.`,
    "",
    "## Power cells",
    "",
  ];

  for (const c of cells) {
    if (!c || typeof c !== "object") continue;
    const id = c.id ?? "(missing id)";
    lines.push(`### ${escMd(id)}`, "");
    lines.push(`- **Responsibility:** ${escMd(c.responsibility ?? "—")}`);
    const arts = Array.isArray(c.artifacts) ? c.artifacts.map((a) => `\`${a}\``).join(", ") : "—";
    lines.push(`- **Artifacts:** ${arts}`);

    const th = formatThresholds(c.thresholds);
    if (th) lines.push(`- **Thresholds:** ${escMd(th)}`);

    if (typeof c.health_check === "string" && c.health_check)
      lines.push(`- **Health check:** \`${escMd(c.health_check)}\``);

    if (typeof c.last_tuned === "string" && c.last_tuned)
      lines.push(`- **Last tuned:** ${escMd(c.last_tuned)}`);

    if (typeof c.tuning_notes === "string" && c.tuning_notes)
      lines.push(`- **Tuning notes:** ${escMd(c.tuning_notes)}`);

    lines.push("");
  }

  const outAbs = join(root, outRel);
  mkdirSync(dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, `${lines.join("\n")}\n`, "utf8");
  process.stdout.write(`[igor-docs] wrote ${outRel}\n`);
}

main();
