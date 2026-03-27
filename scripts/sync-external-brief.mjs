#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DOC_SYNC_BEGIN = "<!-- DOCS_SYNC:BEGIN -->";
const DOC_SYNC_END = "<!-- DOCS_SYNC:END -->";
const DOC_TRUST_BEGIN = "<!-- DOC_TRUST:BEGIN -->";
const DOC_TRUST_END = "<!-- DOC_TRUST:END -->";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8"));
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        // ignore and continue upwards
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function patchMarkedBlock(content, beginMark, endMark, innerMarkdown, labelForError) {
  const i = content.indexOf(beginMark);
  const j = content.indexOf(endMark);
  if (i === -1 || j === -1 || j <= i) {
    throw new Error(
      `${beginMark} / ${endMark} not found in ${labelForError} — add matching HTML comment markers.`
    );
  }
  return (
    content.slice(0, i + beginMark.length) +
    "\n\n" +
    innerMarkdown.trim() +
    "\n\n" +
    content.slice(j)
  );
}

function parseIsoDateToUtcMs(yyyyMmDd) {
  const t = Date.parse(`${yyyyMmDd}T00:00:00.000Z`);
  return Number.isFinite(t) ? t : null;
}

function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function asNumber(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function formatMaybe(v) {
  if (v === null || v === undefined) return "unknown";
  return String(v);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  console.error("sync-external-brief: monorepo root not found");
  process.exit(1);
}

const metricsPath = join(root, "docs", "fire-metrics.json");
const briefPath = join(root, "docs", "AIOM-Technical-Brief.md");
if (!existsSync(briefPath)) {
  console.error(`sync-external-brief: missing ${briefPath}`);
  process.exit(1);
}

const metrics = readJsonIfExists(metricsPath) ?? {};
const truthMatrix = readJsonIfExists(join(root, "artifacts", "truth-matrix.json"));
if (!truthMatrix || typeof truthMatrix !== "object") {
  console.error(
    "sync-external-brief: missing artifacts/truth-matrix.json (run pnpm truth:build or pnpm fire:sync)",
  );
  process.exit(1);
}
const truthRaw = readFileSync(join(root, "artifacts", "truth-matrix.json"), "utf8");
const truthHash = createHash("sha256").update(truthRaw).digest("hex");

const tmMetrics =
  truthMatrix.metrics && typeof truthMatrix.metrics === "object"
    ? truthMatrix.metrics
    : {};
const testsPassed = asNumber(tmMetrics.testsPassed);
const iomCoverage = asNumber(tmMetrics.iomCoverageScore);
const monValue = asNumber(tmMetrics.mon117);
const monReady = tmMetrics.monReady === true;
const monRawStatus = typeof tmMetrics.monRawStatus === "string" ? tmMetrics.monRawStatus : null;
const divergences = Array.isArray(truthMatrix.divergences) ? truthMatrix.divergences : [];
const pnhImmunityCount = asNumber(tmMetrics.pnhImmunityCount);
const pnhTotalScenarios = asNumber(tmMetrics.pnhTotalScenarios);
const pnhBreaches = asNumber(tmMetrics.pnhBreaches);
const wasmStatus = typeof tmMetrics.wasmStatus === "string" ? tmMetrics.wasmStatus : "unknown";

const syncAgeMsBase = parseIsoDateToUtcMs(String(tmMetrics.syncedDateUtc ?? ""));
const isStale =
  syncAgeMsBase === null ? true : Date.now() - syncAgeMsBase > 24 * 60 * 60 * 1000;

const syncBlock = [
  "Producer: `pnpm fire:sync` (`scripts/sync-fire-md.mjs` + `scripts/aggregate-truth.mjs` + `scripts/sync-external-brief.mjs`)",
  "Primary sources:",
  "- `artifacts/truth-matrix.json`",
  "",
  "| Metric | Value | Expected | Definition | Source | Independent check |",
  "|--------|-------|----------|------------|--------|-------------------|",
  `| Tests passed | ${formatMaybe(testsPassed)} | Equals \`metrics.testsPassed\` in canonical artifact | Total passing tests in latest shared-engine Vitest run | \`artifacts/truth-matrix.json\` (\`metrics.testsPassed\`) | \`jq '.metrics.testsPassed' artifacts/truth-matrix.json\` |`,
  `| IOM coverage | ${iomCoverage === null ? "unknown" : iomCoverage.toFixed(3)} | \`0.000 <= metrics.iomCoverageScore <= 1.000\` | Ratio of mapped IOM cells covered in canonical truth artifact | \`artifacts/truth-matrix.json\` (\`metrics.iomCoverageScore\`) | \`jq '.metrics.iomCoverageScore' artifacts/truth-matrix.json\` |`,
  `| MON | ${monValue === null ? `unknown${monRawStatus ? ` (raw=${monRawStatus})` : ""}` : `mon117=${monValue}, monReady=${monReady ? "true" : "false"}`} | \`metrics.mon117 == 117 and metrics.monReady == true\` for release-ready posture | Unified operating number resolved in canonical truth artifact | \`artifacts/truth-matrix.json\` (\`metrics.mon117\`, \`metrics.monReady\`) | \`jq '.metrics | { mon117, monReady, monSource, monRawStatus }' artifacts/truth-matrix.json\` |`,
  `| PNH immunity | ${pnhImmunityCount === null ? "unknown" : pnhImmunityCount}${pnhTotalScenarios === null ? "" : ` / ${pnhTotalScenarios}`}${pnhBreaches === null ? "" : ` (breaches: ${pnhBreaches})`} | \`metrics.pnhImmunityCount == metrics.pnhTotalScenarios - metrics.pnhBreaches\` | Scenario-based resilience result from canonical truth artifact | \`artifacts/truth-matrix.json\` (\`metrics.pnhImmunityCount\`, \`metrics.pnhTotalScenarios\`, \`metrics.pnhBreaches\`) | \`jq '.metrics | { pnhImmunityCount, pnhTotalScenarios, pnhBreaches }' artifacts/truth-matrix.json\` |`,
  `| WASM status | ${wasmStatus} | Value is one of \`available\` or \`unavailable\` | Browser encoder artifact availability | \`artifacts/truth-matrix.json\` (\`metrics.wasmStatus\`) | \`jq '.metrics.wasmStatus' artifacts/truth-matrix.json\` |`,
  `| Sync date (UTC) | ${formatMaybe(tmMetrics.syncedDateUtc)} | Matches format \`YYYY-MM-DD\` | Date written by truth aggregation script | \`artifacts/truth-matrix.json\` (\`metrics.syncedDateUtc\`) | \`jq '.metrics.syncedDateUtc' artifacts/truth-matrix.json\` |`,
  `| Divergences | ${divergences.length === 0 ? "none" : String(divergences.length)} | \`length(divergences) == 0\` for clean state | Canonical divergence array for source consistency checks | \`artifacts/truth-matrix.json\` (\`divergences\`) | \`jq '.divergences | length' artifacts/truth-matrix.json\` |`,
  "",
  "Re-sync procedure (if any metric shows unknown):",
  "1. Run `pnpm verify:harsh`",
  "2. Confirm expected fields exist in `artifacts/truth-matrix.json`",
  "3. Run `pnpm fire:sync`",
  "4. Resolution owner: engineering operator on duty",
  "",
  "Audit procedure:",
  "1. Verify artifact hash: `sha256sum artifacts/truth-matrix.json`",
  "2. Validate fields via `jq` checks in this table",
  "3. Compare with `GET /api/health/truth-matrix` runtime response",
  "4. Investigate and resolve any divergence before sharing",
].join("\n");

const trustBlock = [
  "Data in this document is produced by repository scripts and canonical truth artifacts.",
  "",
  "- Document schema version: `v1.3`",
  `- Last verification timestamp from canonical truth artifact: \`${formatMaybe(truthMatrix.generatedAtUtc)}\``,
  `- Metrics sync date from canonical truth artifact: \`${formatMaybe(tmMetrics.syncedDateUtc)}\``,
  `- Truth file hash: \`${truthHash}\``,
  "- Source file: `artifacts/truth-matrix.json`",
  "",
  "How to verify independently:",
  "",
  "```bash",
  "sha256sum artifacts/truth-matrix.json",
  "```",
  "",
  isStale
    ? "If this metadata is stale (older than 24h), run `pnpm fire:sync` before sharing."
    : "Metadata freshness is within 24 hours.",
  "",
  "Interpretation note: values listed here are raw system metrics. They do not imply correctness without independent verification.",
].join("\n");

const before = readFileSync(briefPath, "utf8");
const afterSync = patchMarkedBlock(
  before,
  DOC_SYNC_BEGIN,
  DOC_SYNC_END,
  syncBlock,
  "docs/AIOM-Technical-Brief.md",
);
const afterTrust = patchMarkedBlock(
  afterSync,
  DOC_TRUST_BEGIN,
  DOC_TRUST_END,
  trustBlock,
  "docs/AIOM-Technical-Brief.md",
);
writeFileSync(briefPath, afterTrust, "utf8");

if (monValue === null) {
  process.stderr.write(
    `sync-external-brief: warning — MON unresolved${monRawStatus ? ` (raw=${monRawStatus})` : ""}; rendered as unknown in brief\n`,
  );
}

process.stderr.write(
  `sync-external-brief: updated docs/AIOM-Technical-Brief.md (stale=${isStale ? "yes" : "no"})\n`,
);
