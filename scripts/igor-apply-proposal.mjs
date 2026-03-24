#!/usr/bin/env node
/**
 * Reads **`tools/iom-proposals.jsonl`** (from **`pnpm igor:heal`**) and offers to append
 * one ghost cell at a time to **`packages/shared-engine/igor-power-cells.json`** after **y** confirmation.
 * Does **not** run **`pnpm igor:sync`** — operator runs that after review.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
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

function parseProposalLines(raw) {
  const proposals = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    let o;
    try {
      o = JSON.parse(t);
    } catch {
      continue;
    }
    if (o.kind === "iom_heal_scan_ok") continue;
    if (o.kind === "iom_ghost_cell" && o.id && Array.isArray(o.artifacts)) {
      proposals.push({
        id: String(o.id),
        responsibility: String(o.responsibility ?? "Pending classification"),
        artifacts: o.artifacts.map((a) => String(a)),
        provenance: o.provenance ?? "igor-apply-proposal.mjs",
        scanTs: o.scanTs,
      });
    }
  }
  return proposals;
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
  if (!root) {
    process.stderr.write("[igor-apply-proposal] monorepo root not found\n");
    process.exit(1);
  }

  const jsonlPath = join(root, "tools", "iom-proposals.jsonl");
  const cellsPath = join(root, "packages", "shared-engine", "igor-power-cells.json");

  if (!existsSync(jsonlPath)) {
    process.stderr.write(
      `[igor-apply-proposal] missing ${jsonlPath} — run pnpm igor:heal first\n`,
    );
    process.exit(1);
  }
  if (!existsSync(cellsPath)) {
    process.stderr.write(`[igor-apply-proposal] missing ${cellsPath}\n`);
    process.exit(1);
  }

  const raw = readFileSync(jsonlPath, "utf8");
  const proposals = parseProposalLines(raw);
  if (proposals.length === 0) {
    process.stdout.write("No iom_ghost_cell lines in tools/iom-proposals.jsonl (nothing to apply).\n");
    process.exit(0);
  }

  const cellsRaw = readFileSync(cellsPath, "utf8");
  const cells = JSON.parse(cellsRaw);
  if (!Array.isArray(cells)) {
    process.stderr.write("[igor-apply-proposal] igor-power-cells.json: expected array\n");
    process.exit(1);
  }

  const existingIds = new Set(cells.map((c) => c?.id).filter(Boolean));

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    for (const p of proposals) {
      process.stdout.write("\n--- Proposal ---\n");
      process.stdout.write(`${JSON.stringify(p, null, 2)}\n`);

      if (existingIds.has(p.id)) {
        process.stdout.write(`Skip: cell id "${p.id}" already exists in igor-power-cells.json\n`);
        continue;
      }

      const beforeSnippet = JSON.stringify(cells.slice(-1)[0] ?? null, null, 2);
      const newRow = {
        id: p.id,
        responsibility: p.responsibility,
        artifacts: p.artifacts,
      };
      process.stdout.write("\n[diff] New row to append (last existing row shown for context):\n");
      process.stdout.write(`… last cell: ${beforeSnippet}\n`);
      process.stdout.write(`+ ${JSON.stringify(newRow)}\n`);

      const ans = (await rl.question(`\nApply this cell to igor-power-cells.json? [y/N] `))
        .trim()
        .toLowerCase();
      if (ans !== "y" && ans !== "yes") {
        process.stdout.write("Skipped.\n");
        continue;
      }

      cells.push(newRow);
      existingIds.add(p.id);
      writeFileSync(cellsPath, `${JSON.stringify(cells, null, 2)}\n`, "utf8");
      process.stdout.write(`Appended cell "${p.id}". Run: pnpm igor:sync\n`);
    }
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + "\n");
  process.exit(1);
});
