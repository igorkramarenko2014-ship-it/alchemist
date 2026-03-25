#!/usr/bin/env node
/**
 * Generates **`docs/iom-architecture.md`** (or `--output <path>`) from **`igor-power-cells.json`**
 * + execution tiers registry.
 *
 * Default output is intentionally operational: Tier 1 + Tier 2 only.
 * Tier 3 is rendered as quarantined advisory cells.
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
  const tiersPath = join(root, "packages", "shared-engine", "execution-tiers.json");
  if (!existsSync(cellsPath)) {
    process.stderr.write(`[igor-docs] missing ${cellsPath}\n`);
    process.exit(1);
  }
  if (!existsSync(tiersPath)) {
    process.stderr.write(`[igor-docs] missing ${tiersPath}\n`);
    process.exit(1);
  }

  const cells = JSON.parse(readFileSync(cellsPath, "utf8"));
  const tiers = JSON.parse(readFileSync(tiersPath, "utf8"));
  if (!Array.isArray(cells)) {
    process.stderr.write("[igor-docs] igor-power-cells.json: expected array\n");
    process.exit(1);
  }
  const tierMap = tiers?.cells ?? {};

  const syncIso = new Date().toISOString().slice(0, 10);
  const lines = [
    "# IOM architecture (auto-generated)",
    "",
    `Last sync: **${syncIso}** — run \`pnpm igor:docs\` to refresh after editing \`igor-power-cells.json\`.`,
    "",
    "> Diagnostic firewall: Tier 3 is advisory-only and must never mutate Tier 1 outcomes without an explicit tested bridge.",
    "",
    "## Operational cells (Tier 1 + Tier 2)",
    "",
  ];

  const operational = [];
  const advisory = [];
  for (const c of cells) {
    const id = c?.id;
    const t = tierMap[id]?.tier ?? "tier3_advisory";
    if (t === "tier1_hot_path" || t === "tier2_release_truth") operational.push(c);
    else advisory.push(c);
  }

  for (const c of operational) {
    if (!c || typeof c !== "object") continue;
    const id = c.id ?? "(missing id)";
    const tier = tierMap[id]?.tier ?? "tier3_advisory";
    const rec = tierMap[id]?.recommendation ?? "QUARANTINE";
    lines.push(`### ${escMd(id)}`, "");
    lines.push(`- **Tier:** \`${escMd(tier)}\``);
    lines.push(`- **Recommendation:** \`${escMd(rec)}\``);
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

  lines.push("## Quarantined advisory cells (Tier 3)", "");
  lines.push(
    "| Cell | Tier | Recommendation | Advisory policy |",
    "|------|------|----------------|-----------------|",
  );
  for (const c of advisory) {
    if (!c || typeof c !== "object") continue;
    const id = c.id ?? "(missing id)";
    const tier = tierMap[id]?.tier ?? "tier3_advisory";
    const rec = tierMap[id]?.recommendation ?? "QUARANTINE";
    lines.push(
      `| \`${escMd(id)}\` | \`${escMd(tier)}\` | \`${escMd(rec)}\` | diagnostic only, no gate mutation / no export authority / no triad override |`,
    );
  }
  lines.push("");

  const outAbs = join(root, outRel);
  mkdirSync(dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, `${lines.join("\n")}\n`, "utf8");
  process.stdout.write(`[igor-docs] wrote ${outRel}\n`);
}

main();
