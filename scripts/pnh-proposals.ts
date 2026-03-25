#!/usr/bin/env npx tsx
/**
 * Rebuild **`tools/pnh-proposals.jsonl`** from **`tools/pnh-simulation-last.json`**.
 * Review-only artifact for IOM-safe enforcement proposals (never auto-applied).
 *
 * Usage:
 *   pnpm pnh:proposals
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPnhEnforcementProposalsFromFailureDetails,
  formatPnhProposalsJsonl,
  PNH_PROPOSAL_BATCH_KIND,
} from "../packages/shared-engine/pnh/pnh-proposal-model.ts";

type PnhStatusLike = "clean" | "warning" | "breach" | "unknown" | "skipped";

interface PnhSimulationLastJson {
  generatedAt?: string;
  pnhStatus?: PnhStatusLike;
  securityVerdict?: "pass" | "degraded" | "fail" | null;
  verifyTruth?: {
    state?: PnhStatusLike;
    failureDetails?: Array<{
      id?: string;
      suite?: string;
      severity?: string;
      location?: string;
      detail?: string;
      message?: string;
    }>;
  };
}

function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 20; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8")) as { name?: string; workspaces?: unknown };
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

function toPnhState(x: unknown): "clean" | "warning" | "breach" {
  return x === "clean" || x === "warning" || x === "breach" ? x : "warning";
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
  if (!root) {
    console.error("pnh-proposals: monorepo root not found");
    process.exit(2);
  }
  const lastPath = join(root, "tools", "pnh-simulation-last.json");
  if (!existsSync(lastPath)) {
    console.error("pnh-proposals: missing tools/pnh-simulation-last.json (run pnpm pnh:simulate first)");
    process.exit(1);
  }

  const raw = readFileSync(lastPath, "utf8");
  const last = JSON.parse(raw) as PnhSimulationLastJson;
  const failureDetails = Array.isArray(last.verifyTruth?.failureDetails)
    ? last.verifyTruth!.failureDetails!
        .filter((d) => d && typeof d.id === "string" && typeof d.message === "string")
        .map((d) => ({
          id: d.id as string,
          suite: typeof d.suite === "string" ? d.suite : "unknown",
          severity: typeof d.severity === "string" ? d.severity : "medium",
          location: typeof d.location === "string" ? d.location : d.id as string,
          detail: typeof d.detail === "string" ? d.detail : d.message as string,
          message: d.message as string,
        }))
    : [];

  const generatedAt = typeof last.generatedAt === "string" ? last.generatedAt : new Date().toISOString();
  const pnhStatus = toPnhState(last.verifyTruth?.state ?? last.pnhStatus);
  const proposals = buildPnhEnforcementProposalsFromFailureDetails(
    failureDetails,
    pnhStatus,
    generatedAt,
  );

  const payload = formatPnhProposalsJsonl(proposals, {
    kind: PNH_PROPOSAL_BATCH_KIND,
    generatedAt,
    pnhStatus,
    securityVerdict: last.securityVerdict ?? null,
    proposalCount: proposals.length,
    provenance: "scripts/pnh-proposals.ts",
    note: "Replayed from tools/pnh-simulation-last.json verifyTruth.failureDetails",
  });
  const outPath = join(root, "tools", "pnh-proposals.jsonl");
  writeFileSync(outPath, payload, "utf8");
  console.error(`pnh-proposals: wrote tools/pnh-proposals.jsonl (${proposals.length} proposal(s))`);
}

main();
