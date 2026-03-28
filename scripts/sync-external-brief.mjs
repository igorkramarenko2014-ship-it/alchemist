#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeUtf8FileAtomic } from "./lib/write-json-atomic.mjs";

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

function parseIsoDateToUtcMs(isoString) {
  const t = Date.parse(isoString);
  return Number.isFinite(t) ? t : null;
}

/** Same policy as `apps/web-app/lib/truth-matrix.ts` `getTruthMaxAgeMs` (scripts have no TS import). */
function getTruthMaxAgeMsForScript() {
  const raw = process.env.ALCHEMIST_TRUTH_MAX_AGE_MINUTES;
  if (raw !== undefined && raw !== "") {
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n * 60 * 1000);
  }
  return process.env.NODE_ENV === "production" ? 15 * 60 * 1000 : 2 * 60 * 60 * 1000;
}

function validateSinglePairMarkers(content, beginMark, endMark, label) {
  const beginCount = content.split(beginMark).length - 1;
  const endCount = content.split(endMark).length - 1;
  if (beginCount !== 1 || endCount !== 1) {
    throw new Error(
      `${label}: expected exactly one ${beginMark} and one ${endMark}; found ${beginCount} begin / ${endCount} end`,
    );
  }
  const i = content.indexOf(beginMark);
  const j = content.indexOf(endMark);
  if (j <= i) throw new Error(`${label}: end marker must follow begin marker`);
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
const testsTotal = asNumber(tmMetrics.testsTotal);
const iomCoverage = asNumber(tmMetrics.iomCoverageScore);
const monObj = tmMetrics.mon && typeof tmMetrics.mon === "object" ? tmMetrics.mon : {};
const monValue = asNumber(monObj.value);
const monIsReady = monObj.ready === true;
const monRawStatus = typeof monObj.rawStatus === "string" ? monObj.rawStatus : null;
const divergences = Array.isArray(truthMatrix.divergences) ? truthMatrix.divergences : [];
const pnhImmunity =
  tmMetrics.pnhImmunity && typeof tmMetrics.pnhImmunity === "object" ? tmMetrics.pnhImmunity : {};
const pnhPassed = asNumber(pnhImmunity.passed);
const pnhTotal = asNumber(pnhImmunity.total);
const pnhBreaches = asNumber(pnhImmunity.breaches);
const pnhStatus = typeof pnhImmunity.status === "string" ? pnhImmunity.status : "unknown";
const wasmStatus = typeof tmMetrics.wasmStatus === "string" ? tmMetrics.wasmStatus : "unknown";

const generatedAtMs = parseIsoDateToUtcMs(String(truthMatrix.generatedAtUtc ?? ""));
const maxAgeMs = getTruthMaxAgeMsForScript();
const isStale =
  generatedAtMs === null ? true : Date.now() - generatedAtMs > maxAgeMs;

const syncBlock = [
  "Producer: `pnpm fire:sync` (`scripts/sync-fire-md.mjs` + `scripts/aggregate-truth.mjs` + `scripts/sync-external-brief.mjs`)",
  "Primary sources:",
  "- `artifacts/truth-matrix.json`",
  "",
  "| Metric | Value | Expected | Definition | Source | Independent check |",
  "|--------|-------|----------|------------|--------|-------------------|",
  `| Tests passed | ${testsPassed === null ? "unknown" : `${testsPassed} / ${testsTotal === null ? "unknown" : testsTotal}`} | \`metrics.testsPassed == metrics.testsTotal\` | Total passing tests in latest shared-engine Vitest run | \`artifacts/truth-matrix.json\` (\`metrics.testsPassed\`, \`metrics.testsTotal\`) | \`jq '.metrics | { testsPassed, testsTotal }' artifacts/truth-matrix.json\` |`,
  `| IOM coverage | ${iomCoverage === null ? "unknown" : iomCoverage.toFixed(3)} | \`0.000 <= metrics.iomCoverageScore <= 1.000\` | Ratio of mapped IOM cells covered in canonical truth artifact | \`artifacts/truth-matrix.json\` (\`metrics.iomCoverageScore\`) | \`jq '.metrics.iomCoverageScore' artifacts/truth-matrix.json\` |`,
  `| MON | ${monValue === null ? `unknown${monRawStatus ? ` (raw=${monRawStatus})` : ""}` : `value=${monValue}, ready=${monIsReady ? "true" : "false"}`} | \`metrics.mon.value == 117 and metrics.mon.ready == true\` for release-ready posture | Unified operating number resolved in canonical truth artifact | \`artifacts/truth-matrix.json\` (\`metrics.mon\`) | \`jq '.metrics.mon' artifacts/truth-matrix.json\` |`,
  `| PNH immunity | ${pnhPassed === null ? "unknown" : pnhPassed}${pnhTotal === null ? "" : ` / ${pnhTotal}`}${pnhBreaches === null ? "" : ` (breaches: ${pnhBreaches})`} [${pnhStatus}] | \`metrics.pnhImmunity.status in {clean, breach}\` | Scenario-based resilience result from canonical truth artifact | \`artifacts/truth-matrix.json\` (\`metrics.pnhImmunity\`) | \`jq '.metrics.pnhImmunity' artifacts/truth-matrix.json\` |`,
  `| WASM status | ${wasmStatus} | Value is one of \`available\` or \`unavailable\` | Browser encoder artifact availability | \`artifacts/truth-matrix.json\` (\`metrics.wasmStatus\`) | \`jq '.metrics.wasmStatus' artifacts/truth-matrix.json\` |`,
  `| Sync timestamp (UTC) | ${formatMaybe(tmMetrics.syncedAtUtc)} | ISO 8601 timestamp | Time written by truth aggregation script | \`artifacts/truth-matrix.json\` (\`metrics.syncedAtUtc\`) | \`jq '.metrics.syncedAtUtc' artifacts/truth-matrix.json\` |`,
  `| Divergences | ${String(divergences.length)} | \`length(divergences) == 0\` for clean state | Canonical divergence array (runtime/artifact mismatch, schema failure, or freshness violation) | \`artifacts/truth-matrix.json\` (\`divergences\`) | \`jq '.divergences | length' artifacts/truth-matrix.json\` |`,
  "",
  "Re-sync procedure (if any metric shows unknown):",
  "1. Run `pnpm verify:harsh`",
  "2. Schema gates run automatically (`validate-truth-matrix.mjs` + `validate-fire-metrics.mjs`)",
  "3. Run `pnpm fire:sync`",
  "4. Resolution owner: engineering operator on duty",
  "5. Marker integrity note: `pnpm fire:sync` validates required marker blocks and fails if markers are missing or malformed; edits inside `DOC_TRUST`/`DOCS_SYNC` blocks are overwritten.",
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
  `- Metrics sync timestamp from canonical truth artifact: \`${formatMaybe(tmMetrics.syncedAtUtc)}\``,
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
    ? `If this snapshot is stale (older than ${Math.round(maxAgeMs / 60000)}m per ALCHEMIST_TRUTH_MAX_AGE_MINUTES or defaults), run \`pnpm verify:harsh\` then \`pnpm fire:sync\` before sharing.`
    : `Snapshot freshness is within policy (${Math.round(maxAgeMs / 60000)}m max age; prod default 15m, dev default 2h unless overridden).`,
  "",
  "Interpretation note: values listed here are raw system metrics. They do not imply correctness without independent verification.",
].join("\n");

const before = readFileSync(briefPath, "utf8");
validateSinglePairMarkers(before, DOC_SYNC_BEGIN, DOC_SYNC_END, "docs/AIOM-Technical-Brief.md DOCS_SYNC");
validateSinglePairMarkers(before, DOC_TRUST_BEGIN, DOC_TRUST_END, "docs/AIOM-Technical-Brief.md DOC_TRUST");
const afterSync = patchMarkedBlock(
  before,
  DOC_SYNC_BEGIN,
  DOC_SYNC_END,
  syncBlock,
  "docs/AIOM-Technical-Brief.md",
);
validateSinglePairMarkers(afterSync, DOC_SYNC_BEGIN, DOC_SYNC_END, "docs/AIOM-Technical-Brief.md DOCS_SYNC(post-patch)");
const afterTrust = patchMarkedBlock(
  afterSync,
  DOC_TRUST_BEGIN,
  DOC_TRUST_END,
  trustBlock,
  "docs/AIOM-Technical-Brief.md",
);
validateSinglePairMarkers(afterTrust, DOC_TRUST_BEGIN, DOC_TRUST_END, "docs/AIOM-Technical-Brief.md DOC_TRUST(post-patch)");
writeUtf8FileAtomic(briefPath, afterTrust);

if (monValue === null) {
  process.stderr.write(
    `sync-external-brief: warning — MON unresolved${monRawStatus ? ` (raw=${monRawStatus})` : ""}; rendered as unknown in brief\n`,
  );
}

process.stderr.write(
  `sync-external-brief: updated docs/AIOM-Technical-Brief.md (stale=${isStale ? "yes" : "no"})\n`,
);
