#!/usr/bin/env node
/**
 * Writes **`docs/truth-matrix.md`** — operator-facing scenario × outcome table.
 * Run from repo root: **`pnpm truth:matrix`**
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

const scenarios = [
  {
    scenario: "No provider keys",
    triadMode: "stub (HTTP 503 triad_unconfigured or client stub)",
    candidates: "Stub fixtures / client stub fetcher",
    gates: "Yes (same TS gates on candidates)",
    browserExport: "Only if WASM pkg real + /api/health/wasm available",
    authoritativeFxp: "No unless HARD GATE validated + WASM encode path",
    health: "GET /api/health → triad partial/none",
    verifyDefault: "pnpm verify:harsh can be green",
    operatorMsg: "Rankings ≠ live triad; run verify:keys / set keys for parity tests.",
  },
  {
    scenario: "All provider keys set",
    triadMode: "fetcher (fully_live when all succeed)",
    candidates: "Live panelists",
    gates: "Yes",
    browserExport: "Independent of triad; needs WASM",
    authoritativeFxp: "HARD GATE + WASM",
    health: "triadFullyLive often true",
    verifyDefault: "Green does not prove live keys in CI (no secrets)",
    operatorMsg: "CI uses stub; local keys needed for live calibration.",
  },
  {
    scenario: "Tablebase keyword hit",
    triadMode: "tablebase short-circuit",
    candidates: "Deterministic from tablebase",
    gates: "Yes (post short-circuit path)",
    browserExport: "N/A to tablebase",
    authoritativeFxp: "HARD GATE still applies to bytes",
    health: "Same as WASM/triad flags",
    verifyDefault: "Green",
    operatorMsg: "Tablebase is Tier 1 execution (changes outcome vs miss).",
  },
  {
    scenario: "WASM pkg missing or stub",
    triadMode: "Any",
    candidates: "Any",
    gates: "Yes",
    browserExport: "Disabled / unavailable",
    authoritativeFxp: "No",
    health: "GET /api/health/wasm → unavailable",
    verifyDefault: "pnpm verify:harsh green; pnpm harshcheck:wasm may fail",
    operatorMsg: "pnpm build:wasm then REQUIRE_WASM=1 pnpm assert:wasm",
  },
  {
    scenario: "WASM pkg real",
    triadMode: "Any",
    candidates: "Any",
    gates: "Yes",
    browserExport: "Enabled when health wasm available",
    authoritativeFxp: "Still needs HARD GATE for Serum bytes truth",
    health: "wasm ok + wasmArtifactTruth real",
    verifyDefault: "Optional harshcheck:wasm",
    operatorMsg: "Green verify:harsh ≠ export-ready without assert:wasm.",
  },
  {
    scenario: "tools/sample_init.fxp missing, strict off",
    triadMode: "Any",
    candidates: "Any",
    gates: "Yes",
    browserExport: "If WASM ok",
    authoritativeFxp: "Risk: offsets not proven on real preset",
    health: "hardGate files may still show map present",
    verifyDefault: "pnpm assert:hard-gate warns and exits 0",
    operatorMsg: "Set ALCHEMIST_STRICT_OFFSETS=1 for fail-closed.",
  },
  {
    scenario: "ALCHEMIST_STRICT_OFFSETS=1, sample missing",
    triadMode: "Any",
    candidates: "Any",
    gates: "Yes",
    browserExport: "N/A",
    authoritativeFxp: "Blocked",
    health: "N/A",
    verifyDefault: "assert:hard-gate exits 1",
    operatorMsg: "Add real init .fxp under tools/ or skip strict mode.",
  },
  {
    scenario: "Preset share only",
    triadMode: "stub or fetcher",
    candidates: "User-selected gated candidate",
    gates: "Share uses score/reasoning/paramArray gates",
    browserExport: "No .fxp on SharedPreset",
    authoritativeFxp: "No",
    health: "N/A",
    verifyDefault: "Green",
    operatorMsg: "Sharing is not export; no Serum bytes exposed.",
  },
  {
    scenario: "PR touches packages/fxp-encoder (release-sensitive)",
    triadMode: "Any",
    candidates: "Any",
    gates: "Yes",
    browserExport: "pnpm verify:ci enforces strict wasm if diff matches",
    authoritativeFxp: "Enforced by pipeline",
    health: "N/A",
    verifyDefault: "verify:ci may fail without wasm pkg + strict gate",
    operatorMsg: "scripts/enforce-release-strict-gates.mjs after verify:harsh",
  },
];

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[truth-matrix] monorepo root not found\n");
  process.exit(1);
}

const iso = new Date().toISOString().slice(0, 10);
const header = `# Truth matrix (operator)

**Generated:** ${iso} — refresh with \`pnpm truth:matrix\`.

This table is **normative intent**: it summarizes how stub vs fetcher vs tablebase, WASM health, and HARD GATE strictness interact. **Runtime** JSON for the product slice lives at **\`GET /api/health/truth-matrix\`** (built from \`apps/web-app/lib/truth-matrix.ts\`).

## Execution tiers (summary)

| Tier | Role | Examples |
|------|------|----------|
| **1** | User-outcome / hot path | \`triad\`, \`taxonomy\`, \`tablebase\` (short-circuit), \`slavic_score\`, \`undercover_adversarial\`, \`prompt_guard\`, \`preset_share\`, \`integrity\` (export/capability signals) |
| **2** | Ship-blocking verification | \`assert:hard-gate\`, \`assert:wasm\`, \`verify:harsh\`, \`verify:web\`, \`run-verify-with-summary.mjs\`, \`igor:ci\`, \`vst_observer\` (HARD GATE bridge) |
| **3** | Advisory / diagnostic only | \`soe\`, \`schism\`, \`agent_fusion\`, \`triad_governance\`, \`talent_market\`, \`perf_boss\`, \`pnh\`, \`arbitration\` (opt-in), \`vst_wrapper\` pulse — **no gate mutation, no export authority, no triad override** |

Registry: \`packages/shared-engine/execution-tiers.json\` + \`execution-tiers.ts\`.

## Release receipt

After every \`pnpm verify:harsh\` / \`pnpm harshcheck\`, a machine-readable copy of **\`verify_post_summary\`** is written to:

- \`artifacts/verify/verify-post-summary.json\`
- \`.artifacts/verify/verify-post-summary.json\`
- \`artifacts/verify/verify-receipt-<git-sha>.json\` and \`verify-receipt-latest.json\`

Stderr line remains the grep-friendly source of truth for log pipelines.

## Scenarios

| Scenario | Triad mode | Candidates | Gates | Browser export | Authoritative .fxp | Health / verify | Operator message |
|----------|------------|------------|-------|----------------|---------------------|-----------------|------------------|
`;

function escCell(s) {
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

const rows = scenarios
  .map(
    (r) =>
      `| ${escCell(r.scenario)} | ${escCell(r.triadMode)} | ${escCell(r.candidates)} | ${escCell(r.gates)} | ${escCell(r.browserExport)} | ${escCell(r.authoritativeFxp)} | ${escCell(r.health)} / ${escCell(r.verifyDefault)} | ${escCell(r.operatorMsg)} |`,
  )
  .join("\n");

const outPath = join(root, "docs", "truth-matrix.md");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${header}${rows}\n`, "utf8");
process.stdout.write(`[truth-matrix] wrote ${outPath}\n`);
