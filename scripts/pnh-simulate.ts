#!/usr/bin/env npx tsx
/**
 * PNH red-team simulation — ghost + warfare + APT ledger + stub intent row.
 *
 *   pnpm pnh:simulate
 *   pnpm pnh:simulate -- --ci              # exit 1 on breach / regression (CI)
 *   pnpm pnh:simulate -- --write-baseline  # refresh tools/pnh-simulation-baseline.json
 *   pnpm pnh:simulate -- --sequences=9 --target=all
 *
 * Writes **`tools/pnh-simulation-last.json`** for verify_post_summary / differential tracking.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runPnhGhostWar } from "../packages/shared-engine/pnh/pnh-ghost-run.ts";
import {
  runPnhModelWarfare,
  type HardGateWarfareHooks,
  type WarfareTargetFilter,
} from "../packages/shared-engine/pnh/pnh-warfare-model.ts";
import {
  buildPnhSimulationReport,
  computePnhVerifyTruthStatus,
  isOperationalPnhFingerprintKey,
  securityVerdictFromPnhState,
  type PnhSimulationBaselineFile,
} from "../packages/shared-engine/pnh/pnh-simulation-engine.ts";
import {
  buildPnhEnforcementProposals,
  formatPnhProposalsJsonl,
  PNH_PROPOSAL_BATCH_KIND,
} from "../packages/shared-engine/pnh/pnh-proposal-model.ts";

const BASELINE_REL = join("tools", "pnh-simulation-baseline.json");
const LAST_REL = join("tools", "pnh-simulation-last.json");
const PROPOSALS_REL = join("tools", "pnh-proposals.jsonl");

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

function parseArgs(argv: string[]) {
  let sequences = 9;
  let target: WarfareTargetFilter = "all";
  let ci = false;
  let writeBaseline = false;
  for (const a of argv) {
    if (a.startsWith("--sequences=")) {
      const n = Number(a.slice("--sequences=".length));
      if (Number.isFinite(n) && n >= 1) sequences = Math.min(9, Math.floor(n));
    } else if (a.startsWith("--target=")) {
      const t = a.slice("--target=".length) as WarfareTargetFilter;
      if (t === "all" || t === "hard-gate" || t === "triad" || t === "flow") target = t;
    } else if (a === "--ci") ci = true;
    else if (a === "--write-baseline") writeBaseline = true;
  }
  return { sequences, target, ci, writeBaseline };
}

async function tryLoadHardGateHooks(root: string): Promise<HardGateWarfareHooks | undefined> {
  const samplePath = join(root, "tools", "sample_init.fxp");
  const wasmJs = join(root, "packages", "fxp-encoder", "pkg", "fxp_encoder.js");
  const wasmBin = join(root, "packages", "fxp-encoder", "pkg", "fxp_encoder_bg.wasm");
  if (!existsSync(samplePath) || !existsSync(wasmJs) || !existsSync(wasmBin)) {
    return undefined;
  }
  try {
    const mod = (await import(pathToFileURL(wasmJs).href)) as {
      initSync: (m: Uint8Array) => void;
      decode_fxp_fxck: (data: Uint8Array) => { params: Float32Array; programName?: string };
      encode_fxp_fxck: (params: Float32Array, programName: string) => Uint8Array;
    };
    mod.initSync(readFileSync(wasmBin));
    const sampleFxpBytes = new Uint8Array(readFileSync(samplePath));
    const sampleDecoded = mod.decode_fxp_fxck(sampleFxpBytes);
    const sampleCount = Array.isArray(sampleDecoded.params)
      ? sampleDecoded.params.length
      : sampleDecoded.params.length;
    return {
      sampleFxpBytes,
      decodeFxck: (bytes) => {
        const o = mod.decode_fxp_fxck(bytes);
        return { params: o.params, programName: o.programName };
      },
      encodeFxck: (params, programName) => {
        if (params.length !== sampleCount) {
          throw new Error(`param_count_drift_blocked: expected=${sampleCount} got=${params.length}`);
        }
        return mod.encode_fxp_fxck(params, programName);
      },
    };
  } catch {
    return undefined;
  }
}

function loadBaseline(root: string): PnhSimulationBaselineFile | null {
  const p = join(root, BASELINE_REL);
  if (!existsSync(p)) return null;
  try {
    const j = JSON.parse(readFileSync(p, "utf8")) as PnhSimulationBaselineFile;
    if (j.version !== 1 || typeof j.fingerprints !== "object" || j.fingerprints === null) return null;
    return j;
  } catch {
    return null;
  }
}

function operationalFingerprintsOnly(fp: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(fp)) {
    if (isOperationalPnhFingerprintKey(k)) o[k] = v;
  }
  return o;
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
  if (!root) {
    console.error("pnh-simulate: monorepo root not found");
    process.exit(2);
  }

  const argv = process.argv.slice(2).filter((a) => a !== "--");
  const { sequences, target, ci, writeBaseline } = parseArgs(argv);

  const ghost = runPnhGhostWar();
  const hardGateHooks = await tryLoadHardGateHooks(root);
  const warfare = runPnhModelWarfare({
    maxSequences: sequences,
    target,
    hardGateHooks,
  });

  const baselineOnDisk = loadBaseline(root);
  const report = buildPnhSimulationReport(ghost, warfare, {
    baseline: ci || !writeBaseline ? baselineOnDisk : null,
  });

  const verifyTruth = computePnhVerifyTruthStatus(report);
  const securityVerdict = securityVerdictFromPnhState(verifyTruth.state);
  const enforcementProposals = buildPnhEnforcementProposals(report);
  const proposalBatch = {
    kind: PNH_PROPOSAL_BATCH_KIND,
    generatedAt: report.generatedAt,
    pnhStatus: report.pnhStatus,
    securityVerdict,
    proposalCount: enforcementProposals.length,
    provenance: "scripts/pnh-simulate.ts",
    note: "IOM-safe batch header — proposals are not consumed by igor:apply (power cells). Review-only.",
  };
  writeFileSync(
    join(root, PROPOSALS_REL),
    formatPnhProposalsJsonl(enforcementProposals, proposalBatch),
    "utf8",
  );
  process.stderr.write(
    `${JSON.stringify({
      ts: new Date().toISOString(),
      event: "pnh_enforcement_proposals_emitted",
      proposalCount: enforcementProposals.length,
      path: PROPOSALS_REL,
      pnhStatus: report.pnhStatus,
    })}\n`,
  );
  console.error(
    `pnh-simulate: wrote ${PROPOSALS_REL} (${enforcementProposals.length} enforcement proposal(s), review-only — not auto-applied)`,
  );

  if (writeBaseline) {
    const baselineOut: PnhSimulationBaselineFile = {
      version: 1,
      note: "Operational PNH fingerprints only (ghost, warfare, intent stub). Regenerate with pnpm pnh:simulate -- --write-baseline",
      fingerprints: operationalFingerprintsOnly(report.fingerprints) as PnhSimulationBaselineFile["fingerprints"],
    };
    writeFileSync(join(root, BASELINE_REL), `${JSON.stringify(baselineOut, null, 2)}\n`, "utf8");
    console.error(`pnh-simulate: wrote ${BASELINE_REL}`);
  }

  const summaryPayload = {
    totalScenarios: report.totalScenarios,
    breaches: report.breaches,
    regressions: report.regressions,
    severityBreakdown: report.severityBreakdown,
    pnhStatus: report.pnhStatus,
    securityVerdict,
    verifyTruth,
    ghostPassed: ghost.passed,
    warfareBreaches: warfare.summary.breach,
  };

  writeFileSync(join(root, LAST_REL), `${JSON.stringify({ ...summaryPayload, generatedAt: report.generatedAt }, null, 2)}\n`, "utf8");
  console.error(`pnh-simulate: wrote ${LAST_REL}`);

  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event: "pnh_simulation_summary",
    ...summaryPayload,
  });
  process.stderr.write(`${line}\n`);

  console.error(
    `pnh-simulate: securityVerdict=${securityVerdict ?? "n/a"} pnhStatus=${report.pnhStatus} highSeveritySignals=${verifyTruth.highSeverityCount} breaches=${report.breaches} regressions=${report.regressions} total=${report.totalScenarios}`,
  );
  for (const d of verifyTruth.failureDetails) {
    console.error(`pnh-simulate: ${d.message}`);
  }

  if (writeBaseline) {
    process.exit(0);
    return;
  }

  if (ci) {
    if (baselineOnDisk === null) {
      console.error("pnh-simulate: --ci requires tools/pnh-simulation-baseline.json (run --write-baseline once)");
      process.exit(1);
    }
    if (report.diff && report.diff.missingKeys.length > 0) {
      console.error(
        `pnh-simulate: missing keys vs baseline (${report.diff.missingKeys.slice(0, 6).join(", ")}…) — fix runner or refresh baseline`,
      );
      process.exit(1);
    }
    if (report.pnhStatus === "breach") {
      console.error("pnh-simulate: --ci FAIL — breach tier (pipeline breach, regression, or missing baseline keys)");
      process.exit(1);
    }
    const allowWarning = process.env.ALCHEMIST_PNH_ALLOW_WARNING === "1";
    if (report.pnhStatus === "warning" && !allowWarning) {
      console.error(
        "pnh-simulate: --ci FAIL — degraded security posture (warning tier: medium failures and/or fingerprint drift). Fix probes or set ALCHEMIST_PNH_ALLOW_WARNING=1 only as a temporary escape hatch. See tools/pnh-simulation-last.json → verifyTruth.failureDetails.",
      );
      process.exit(1);
    }
    if (report.pnhStatus === "warning" && allowWarning) {
      console.error(
        "pnh-simulate: WARNING tier allowed by ALCHEMIST_PNH_ALLOW_WARNING=1 — not a clean security pass; see verifyTruth.failureDetails",
      );
    }
  }
}

main().catch((e) => {
  console.error("pnh-simulate:", e);
  process.exit(2);
});
