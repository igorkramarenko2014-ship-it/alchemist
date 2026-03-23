#!/usr/bin/env node
/**
 * Parses `docs/brain.md` (§9a) JSON calibration block and emits
 * `packages/shared-engine/brain-fusion-calibration.gen.ts`.
 *
 * Usage (repo root):
 *   node scripts/sync-brain-fusion.mjs           # write .gen.ts
 *   node scripts/sync-brain-fusion.mjs --check   # exit 1 if .gen.ts stale
 *
 *   pnpm brain:sync
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MARK_BEGIN = "<!-- ALCHEMIST:BRAIN_FUSION_CALIBRATION:BEGIN -->";
const MARK_END = "<!-- ALCHEMIST:BRAIN_FUSION_CALIBRATION:END -->";

const SOE_HINT_CODES = [
  "STUB_PROD_PARITY",
  "KEYS_AND_TIMEOUTS",
  "GATE_SOURCE_QC",
  "API_CONSTRAINT_ENTROPY",
  "STRESSED_DUAL",
  "LATENCY_PROMPT_UX",
  "GOVERNANCE_VELOCITY",
  "NOMINAL_VERIFY_MILE",
];

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

function extractJsonFromBrain(md) {
  const i = md.indexOf(MARK_BEGIN);
  const j = md.indexOf(MARK_END);
  if (i === -1 || j === -1 || j <= i) {
    throw new Error(
      "brain.md: missing BRAIN_FUSION_CALIBRATION markers (ALCHEMIST:BRAIN_FUSION_CALIBRATION:BEGIN/END)"
    );
  }
  const slice = md.slice(i + MARK_BEGIN.length, j).trim();
  const m = slice.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (!m) {
    throw new Error("brain.md: expected ```json fenced block between fusion calibration markers");
  }
  return JSON.parse(m[1].trim());
}

function validateCalibration(data) {
  if (data == null || typeof data !== "object") throw new Error("calibration: expected object root");
  if (typeof data.version !== "number") throw new Error("calibration.version must be a number");
  if (typeof data.ajiChatBridge !== "string" || !data.ajiChatBridge.trim()) {
    throw new Error("calibration.ajiChatBridge must be a non-empty string");
  }
  const needObjects = ["health", "talent", "taxonomy", "arbitration", "mobile", "greatLibrary", "soe"];
  for (const k of needObjects) {
    if (data[k] == null || typeof data[k] !== "object") throw new Error(`calibration.${k} must be an object`);
  }
  const h = data.health;
  for (const k of ["HEALTH_WASM", "HEALTH_TRIAD_OFF", "HEALTH_TRIAD_PARTIAL", "HEALTH_NOMINAL"]) {
    if (typeof h[k] !== "string" || !h[k].trim()) throw new Error(`calibration.health.${k} must be a non-empty string`);
  }
  const t = data.talent;
  for (const k of ["TALENT_INSUFFICIENT_DATA", "TALENT_GAP_TEMPLATE", "TALENT_NOMINAL"]) {
    if (typeof t[k] !== "string" || !t[k].trim()) throw new Error(`calibration.talent.${k} must be a non-empty string`);
  }
  if (typeof data.taxonomy.poolBoundTemplate !== "string") {
    throw new Error("calibration.taxonomy.poolBoundTemplate must be a string");
  }
  if (!Array.isArray(data.arbitration.lines) || data.arbitration.lines.length === 0) {
    throw new Error("calibration.arbitration.lines must be a non-empty string array");
  }
  if (typeof data.mobile.MOBILE_SHELL !== "string") {
    throw new Error("calibration.mobile.MOBILE_SHELL must be a string");
  }
  if (typeof data.greatLibrary.aglProvenanceTemplate !== "string") {
    throw new Error("calibration.greatLibrary.aglProvenanceTemplate must be a string");
  }
  const soe = data.soe;
  if (soe.thresholds == null || typeof soe.thresholds !== "object") {
    throw new Error("calibration.soe.thresholds required");
  }
  const th = soe.thresholds;
  const thKeys = [
    "stubHeavyFusion",
    "triadFailureForKeysHint",
    "triadFailureForRelax",
    "gateDropForTighten",
    "triadFailureCeilingForTighten",
    "dualStressFailure",
    "dualStressGateDrop",
    "meanPanelistMsLatency",
    "meanRunMsLatency",
    "defaultPromptMax",
    "latencySuggestedPromptMax",
  ];
  for (const k of thKeys) {
    if (typeof th[k] !== "number" || !Number.isFinite(th[k])) {
      throw new Error(`calibration.soe.thresholds.${k} must be a finite number`);
    }
  }
  const rm = soe.recommendationMessages;
  if (rm == null || typeof rm !== "object") throw new Error("calibration.soe.recommendationMessages required");
  for (const k of ["nominal", "elevatedFailure", "heavyGateDrop", "highLatency", "stressed"]) {
    if (typeof rm[k] !== "string") throw new Error(`calibration.soe.recommendationMessages.${k} must be a string`);
  }
  const hints = soe.hints;
  if (hints == null || typeof hints !== "object") throw new Error("calibration.soe.hints required");
  for (const code of SOE_HINT_CODES) {
    if (typeof hints[code] !== "string" || !hints[code].trim()) {
      throw new Error(`calibration.soe.hints.${code} must be a non-empty string`);
    }
  }
}

function emitTs(data) {
  const lines = [];
  lines.push("/**");
  lines.push(" * Generated by scripts/sync-brain-fusion.mjs from docs/brain.md (§9a).");
  lines.push(" * Do not hand-edit — run `pnpm brain:sync` after changing the JSON block.");
  lines.push(" */");
  lines.push("/* eslint-disable */");
  lines.push("");
  lines.push(`export const BRAIN_FUSION_CALIBRATION_VERSION = ${data.version} as const;`);
  lines.push(`export const BRAIN_AJI_CHAT_BRIDGE = ${JSON.stringify(data.ajiChatBridge)};`);
  lines.push("");
  lines.push("export const BRAIN_HEALTH_FUSION = {");
  for (const [k, v] of Object.entries(data.health)) {
    lines.push(`  ${k}: ${JSON.stringify(v)},`);
  }
  lines.push("} as const;");
  lines.push("");
  lines.push(`export const BRAIN_TALENT_INSUFFICIENT = ${JSON.stringify(data.talent.TALENT_INSUFFICIENT_DATA)};`);
  lines.push(`export const BRAIN_TALENT_GAP_TEMPLATE = ${JSON.stringify(data.talent.TALENT_GAP_TEMPLATE)};`);
  lines.push(`export const BRAIN_TALENT_NOMINAL = ${JSON.stringify(data.talent.TALENT_NOMINAL)};`);
  lines.push("");
  lines.push(`export const BRAIN_TAXONOMY_POOL_BOUND_TEMPLATE = ${JSON.stringify(data.taxonomy.poolBoundTemplate)};`);
  lines.push("");
  lines.push("export const BRAIN_ARBITRATION_AGENT_AJI_FUSION_LINES = [");
  for (const line of data.arbitration.lines) {
    lines.push(`  ${JSON.stringify(line)},`);
  }
  lines.push("] as const;");
  lines.push("");
  lines.push(`export const BRAIN_MOBILE_SHELL_LINE = ${JSON.stringify(data.mobile.MOBILE_SHELL)};`);
  lines.push("");
  lines.push(
    `export const BRAIN_GREAT_LIBRARY_AGL_TEMPLATE = ${JSON.stringify(data.greatLibrary.aglProvenanceTemplate)};`
  );
  lines.push("");
  lines.push("export const BRAIN_SOE_THRESHOLDS = {");
  for (const [k, v] of Object.entries(data.soe.thresholds)) {
    lines.push(`  ${k}: ${v},`);
  }
  lines.push("} as const;");
  lines.push("");
  lines.push("export const BRAIN_SOE_RECOMMENDATION_MESSAGES = {");
  for (const [k, v] of Object.entries(data.soe.recommendationMessages)) {
    lines.push(`  ${k}: ${JSON.stringify(v)},`);
  }
  lines.push("} as const;");
  lines.push("");
  lines.push("export const BRAIN_SOE_FUSION_HINTS = {");
  for (const code of SOE_HINT_CODES) {
    lines.push(`  ${code}: ${JSON.stringify(data.soe.hints[code])},`);
  }
  lines.push("} as const;");
  lines.push("");
  lines.push("export function formatBrainTalentGapFusionLine(gapFixed: string, weakest: string): string {");
  lines.push(
    "  return BRAIN_TALENT_GAP_TEMPLATE.replace(/\\{\\{gap\\}\\}/g, gapFixed).replace(/\\{\\{weakest\\}\\}/g, weakest);"
  );
  lines.push("}");
  lines.push("");
  lines.push("export function formatBrainTaxonomyPoolBoundFusion(size: number, max: number): string {");
  lines.push(
    "  return BRAIN_TAXONOMY_POOL_BOUND_TEMPLATE.replace(/\\{\\{size\\}\\}/g, String(size)).replace(/\\{\\{max\\}\\}/g, String(max));"
  );
  lines.push("}");
  lines.push("");
  lines.push("export function formatBrainGreatLibraryAglLine(appliedKeys: string, provenance: string): string {");
  lines.push(
    "  return BRAIN_GREAT_LIBRARY_AGL_TEMPLATE.replace(/\\{\\{appliedKeys\\}\\}/g, appliedKeys).replace(/\\{\\{provenance\\}\\}/g, provenance);"
  );
  lines.push("}");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
const checkOnly = process.argv.includes("--check");

if (!root) {
  process.stderr.write("[brain:sync] monorepo root not found\n");
  process.exit(1);
}

const brainPath = join(root, "docs", "brain.md");
const outPath = join(root, "packages", "shared-engine", "brain-fusion-calibration.gen.ts");

if (!existsSync(brainPath)) {
  process.stderr.write(`[brain:sync] missing ${brainPath}\n`);
  process.exit(1);
}

const md = readFileSync(brainPath, "utf8");
let data;
try {
  data = extractJsonFromBrain(md);
  validateCalibration(data);
} catch (e) {
  process.stderr.write(`[brain:sync] ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}

const ts = emitTs(data);

if (checkOnly) {
  if (!existsSync(outPath)) {
    process.stderr.write(
      `[brain:sync] --check: missing ${outPath} — run pnpm brain:sync\n`
    );
    process.exit(1);
  }
  const existing = readFileSync(outPath, "utf8");
  if (existing !== ts) {
    process.stderr.write(
      "[brain:sync] --check: brain-fusion-calibration.gen.ts is stale vs docs/brain.md §9a — run pnpm brain:sync\n"
    );
    process.exit(1);
  }
  process.stderr.write("[brain:sync] --check: OK (gen matches brain.md)\n");
  process.exit(0);
}

writeFileSync(outPath, ts, "utf8");
process.stderr.write(`[brain:sync] wrote ${outPath}\n`);
