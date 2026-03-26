import type { ImmunityReport, PnhProbeResult } from "./pnh-ghost-run";
import type { PnhScenarioId } from "./pnh-scenarios";
import fs from "node:fs";
import path from "node:path";

export interface PnhImmunityLedgerEntry {
  scenarioId: PnhScenarioId;
  probeId: string;
  severity: "high" | "medium";
  outcome: "immune" | "breach";
  vaccine: string;
  checkLocation: string;
  detail: string;
  ts: string;
}

type VaccineMeta = {
  vaccine: string;
  checkLocation: string;
};

const VACCINE_MAP: Readonly<Record<PnhScenarioId, Readonly<Record<string, VaccineMeta>>>> = {
  GATE_BYPASS_PAYLOAD: {
    param_out_of_range: {
      vaccine: "Consensus serum param range enforcement",
      checkLocation: "packages/shared-engine/validate.ts",
    },
    param_nan: {
      vaccine: "Consensus finite-number guard",
      checkLocation: "packages/shared-engine/validate.ts",
    },
    param_infinity: {
      vaccine: "Consensus finite-number guard",
      checkLocation: "packages/shared-engine/validate.ts",
    },
    score_out_of_band: {
      vaccine: "filterValid score band validation [0,1]",
      checkLocation: "packages/shared-engine/validate.ts",
    },
  },
  PROMPT_HIJACK_TRIAD: {
    prompt_markers_DEEPSEEK: {
      vaccine: "PNH prompt defense markers in panelist system prompt",
      checkLocation: "packages/shared-engine/triad-panelist-prompt.ts",
    },
    prompt_markers_LLAMA: {
      vaccine: "PNH prompt defense markers in panelist system prompt",
      checkLocation: "packages/shared-engine/triad-panelist-prompt.ts",
    },
    prompt_markers_QWEN: {
      vaccine: "PNH prompt defense markers in panelist system prompt",
      checkLocation: "packages/shared-engine/triad-panelist-prompt.ts",
    },
  },
  SLAVIC_SWARM_CREDIT_DRAIN: {
    identical_param_swarm: {
      vaccine: "Slavic cosine/text dedupe collapse",
      checkLocation: "packages/shared-engine/score.ts",
    },
  },
} as const;

function resolveVaccine(scenarioId: PnhScenarioId, probe: PnhProbeResult): VaccineMeta {
  const scoped = VACCINE_MAP[scenarioId];
  const row = scoped?.[probe.id];
  if (row) return row;
  return {
    vaccine: "Manual PNH vaccine mapping required",
    checkLocation: "packages/shared-engine/pnh/immunity-ledger.ts",
  };
}

/**
 * Builds deterministic "immunity ledger" rows from ghost-war probes.
 * This is diagnostic evidence only (no runtime mutation, no auto-patch path).
 */
export function buildPnhImmunityLedger(report: ImmunityReport): PnhImmunityLedgerEntry[] {
  const out: PnhImmunityLedgerEntry[] = [];
  for (const s of report.scenarios) {
    for (const p of s.probes) {
      const v = resolveVaccine(s.scenarioId, p);
      out.push({
        scenarioId: s.scenarioId,
        probeId: p.id,
        severity: s.severity,
        outcome: p.outcome,
        vaccine: v.vaccine,
        checkLocation: v.checkLocation,
        detail: p.detail,
        ts: report.generatedAt,
      });
    }
  }
  return out;
}

function resolveMonorepoRoot(start: string): string | null {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "apps")) && fs.existsSync(path.join(dir, "packages"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function resolveImmunityLedgerPath(): string {
  const forced = process.env.ALCHEMIST_PNH_IMMUNITY_FILE?.trim();
  if (forced) return forced;
  const root = resolveMonorepoRoot(process.cwd());
  if (root) return path.join(root, "tools", "pnh-immunity.jsonl");
  return path.join(process.cwd(), "tools", "pnh-immunity.jsonl");
}

/**
 * Appends one immunity event as JSONL.
 * Audit-only side effect: no runtime policy mutation, no auto-patch path.
 */
export function recordImmunity(entry: PnhImmunityLedgerEntry): void {
  const outPath = resolveImmunityLedgerPath();
  const dir = path.dirname(outPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(outPath, `${JSON.stringify(entry)}\n`, "utf8");
}


