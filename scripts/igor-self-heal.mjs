#!/usr/bin/env node
/**
 * IOM self-heal **scan** — walks `packages/shared-engine` for `.ts` sources not listed in any
 * `igor-power-cells.json` artifact. Emits auditable stderr JSON; **does not** mutate JSON.
 *
 * Writes **`tools/iom-proposals.jsonl`** (gitignored) for **`pnpm igor:apply`**, or copy rows by hand,
 * then **`pnpm igor:sync`** after editing **`igor-power-cells.json`**.
 *
 * Proposal lines may include **`suggestedHealthCheck`**, **`confidence`**, **`tuningNotes`** for docs
 * and operator review (still human-applied via **`pnpm igor:apply`**).
 *
 * @see packages/shared-engine/igor-orchestrator-layer.ts IOM_POLICY_CELL_MAX
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inferGhostConfidence,
  inferGhostHealthCheckHint,
  scanIomGhostArtifacts,
} from "./lib/iom-registry-scan.mjs";

const IOM_POLICY_CELL_MAX = 12;

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

function logEvent(event, payload) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...payload,
  });
  process.stderr.write(`${line}\n`);
}

function writeProposalsJsonl(root, proposals, scanTs) {
  const toolsDir = join(root, "tools");
  mkdirSync(toolsDir, { recursive: true });
  const outPath = join(toolsDir, "iom-proposals.jsonl");
  const lines = proposals.map((p) =>
    JSON.stringify({
      kind: "iom_ghost_cell",
      scanTs,
      provenance: "igor-self-heal.mjs",
      id: p.id,
      responsibility: p.responsibility,
      artifacts: p.artifacts,
      suggestedHealthCheck: p.suggestedHealthCheck,
      confidence: p.confidence,
      tuningNotes: p.tuningNotes,
    }),
  );
  writeFileSync(outPath, lines.length ? `${lines.join("\n")}\n` : "", "utf8");
  process.stdout.write(
    `\nWrote ${lines.length} line(s) → tools/iom-proposals.jsonl (gitignored). Run pnpm igor:apply to review y/n.\n`,
  );
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
  if (!root) {
    process.stderr.write("[igor-self-heal] monorepo root not found\n");
    process.exit(1);
  }

  let ghostList;
  let cellCount;
  try {
    const scan = scanIomGhostArtifacts(root);
    ghostList = scan.ghostArtifacts;
    cellCount = scan.cellCount;
  } catch (e) {
    process.stderr.write(`[igor-self-heal] ${String(e?.message ?? e)}\n`);
    process.exit(1);
  }

  const scanTs = new Date().toISOString();

  if (ghostList.length > 0) {
    const proposals = ghostList.map((file) => {
      const base = file.replace(/\.ts$/, "").split("/").pop() ?? file;
      const id = base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      const suggestedHealthCheck = inferGhostHealthCheckHint(file);
      const confidence = inferGhostConfidence(file);
      return {
        id: id || "unknown_cell",
        responsibility: "Pending classification — detected via igor-self-heal scan",
        artifacts: [file],
        suggestedHealthCheck,
        confidence,
        tuningNotes: "Auto-suggested from ghost scan — verify thresholds before merge",
      };
    });

    writeProposalsJsonl(root, proposals, scanTs);

    logEvent("iom_self_heal_proposal", {
      reason: "igor_self_heal_scan",
      currentCellCount: cellCount,
      policyCellMax: IOM_POLICY_CELL_MAX,
      ghostCount: ghostList.length,
      overPolicyCellBudget: cellCount > IOM_POLICY_CELL_MAX,
      transmutationNote:
        cellCount >= IOM_POLICY_CELL_MAX
          ? "merge before add — IOM_POLICY_CELL_MAX discipline"
          : undefined,
      suggestedGhosts: proposals,
    });

    process.stdout.write("\n🧪 IOM self-heal scan — ghost artifacts (review required)\n\n");
    for (const p of proposals) {
      const hi = p.confidence >= 0.7 ? " (high-confidence cue)" : "";
      process.stdout.write(
        `  • ${p.artifacts[0]}  →  id: ${p.id}${hi}\n` +
          `    health check hint: ${p.suggestedHealthCheck}\n`,
      );
    }
    process.stdout.write(
      `\nTo promote: pnpm igor:apply — or edit packages/shared-engine/igor-power-cells.json by hand — then pnpm igor:sync\n` +
        `Policy target: ≤ ${IOM_POLICY_CELL_MAX} cells (current ${cellCount}).\n\n`,
    );
    process.exitCode = 0;
    return;
  }

  mkdirSync(join(root, "tools"), { recursive: true });
  writeFileSync(
    join(root, "tools", "iom-proposals.jsonl"),
    `${JSON.stringify({
      kind: "iom_heal_scan_ok",
      scanTs,
      provenance: "igor-self-heal.mjs",
      note: "no ghost artifacts under allowlist rules",
      currentCellCount: cellCount,
    })}\n`,
    "utf8",
  );

  logEvent("iom_self_heal_scan_ok", {
    reason: "igor_self_heal_scan",
    currentCellCount: cellCount,
    policyCellMax: IOM_POLICY_CELL_MAX,
    note: "no unregistered engine .ts files (excluding cross-cutting allowlist + registered artifacts)",
  });
  process.stdout.write("✅ IOM registry scan: no ghost artifacts under the allowlist rules.\n");
}

main();
