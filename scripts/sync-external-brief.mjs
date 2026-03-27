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

function readVerifySummary(rootDir) {
  return (
    readJsonIfExists(join(rootDir, "artifacts", "verify", "verify-post-summary.json")) ??
    readJsonIfExists(join(rootDir, ".artifacts", "verify", "verify-post-summary.json"))
  );
}

function asNumber(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function formatMaybe(v) {
  if (v === null || v === undefined) return "unknown";
  return String(v);
}

function resolveMon(verifySummary, metrics) {
  const verifyMon117 = asNumber(verifySummary?.minimumOperatingNumber117);
  if (verifyMon117 !== null) {
    return {
      value: verifyMon117,
      ready: verifySummary?.minimumOperatingReady === true,
      source: "verify_post_summary",
      raw: null,
    };
  }
  const initiationStatus =
    typeof metrics?.initiationStatus === "string" ? metrics.initiationStatus : null;
  if (initiationStatus === "117/117_READY") {
    return { value: 117, ready: true, source: "initiationStatus", raw: initiationStatus };
  }
  if (initiationStatus) {
    return { value: null, ready: false, source: "initiationStatus", raw: initiationStatus };
  }
  return { value: null, ready: false, source: "unresolved", raw: null };
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  console.error("sync-external-brief: monorepo root not found");
  process.exit(1);
}

const metricsPath = join(root, "docs", "fire-metrics.json");
const briefPath = join(root, "docs", "AIOM-Technical-Brief.md");
if (!existsSync(metricsPath)) {
  console.error(`sync-external-brief: missing ${metricsPath} (run pnpm fire:sync first)`);
  process.exit(1);
}
if (!existsSync(briefPath)) {
  console.error(`sync-external-brief: missing ${briefPath}`);
  process.exit(1);
}

const metricsRaw = readFileSync(metricsPath, "utf8");
const metrics = JSON.parse(metricsRaw);
const metricsHash = createHash("sha256").update(metricsRaw).digest("hex");

const verifySummary = readVerifySummary(root);
const iomCoverage = asNumber(verifySummary?.iomCoverageScore);
const mon = resolveMon(verifySummary, metrics);
const pnhTotal = asNumber(verifySummary?.pnhSimulation?.totalScenarios);
const pnhBreaches = asNumber(verifySummary?.pnhSimulation?.breaches);
const pnhImmunityCount =
  pnhTotal !== null && pnhBreaches !== null ? Math.max(0, pnhTotal - pnhBreaches) : null;
const wasmStatus = typeof verifySummary?.wasmStatus === "string"
  ? verifySummary.wasmStatus
  : typeof metrics?.vst3BundlePresent === "boolean"
    ? metrics.vst3BundlePresent ? "available" : "unknown"
    : "unknown";

const syncAgeMsBase = parseIsoDateToUtcMs(metrics.syncedDateUtc);
const isStale =
  syncAgeMsBase === null ? true : Date.now() - syncAgeMsBase > 24 * 60 * 60 * 1000;

const syncBlock = [
  "Producer: `pnpm fire:sync` (`scripts/sync-fire-md.mjs` + `scripts/sync-external-brief.mjs`)",
  "Primary sources:",
  "- `docs/fire-metrics.json`",
  "- `artifacts/verify/verify-post-summary.json` (or `.artifacts/verify/verify-post-summary.json`)",
  "",
  "| Metric | Value | Definition | Source | Independent check |",
  "|--------|-------|------------|--------|-------------------|",
  `| Tests passed | ${formatMaybe(metrics.vitestTestsPassed)} | Total passing tests in latest shared-engine Vitest run | \`docs/fire-metrics.json\` (\`vitestTestsPassed\`) | \`jq '.vitestTestsPassed' docs/fire-metrics.json\` |`,
  `| IOM coverage | ${iomCoverage === null ? "unknown" : iomCoverage.toFixed(3)} | Ratio of mapped IOM cells covered in verify summary | \`artifacts/verify/verify-post-summary.json\` (\`iomCoverageScore\`) | \`jq '.iomCoverageScore' artifacts/verify/verify-post-summary.json\` |`,
  `| MON | ${mon.value === null ? `unknown${mon.raw ? ` (value=${mon.raw})` : ""}` : `${mon.value} (ready=${mon.ready ? "yes" : "no"})`} | Unified operating number resolved from verify summary first, then initiation status fallback | \`artifacts/verify/verify-post-summary.json\` or \`docs/fire-metrics.json\` (\`initiationStatus\`) | \`jq '{minimumOperatingNumber117, minimumOperatingReady}' artifacts/verify/verify-post-summary.json\` and \`jq '.initiationStatus' docs/fire-metrics.json\` |`,
  `| PNH immunity count | ${pnhImmunityCount === null ? "unknown" : pnhImmunityCount} | \`totalScenarios - breaches\` in PNH simulation summary | \`artifacts/verify/verify-post-summary.json\` (\`pnhSimulation\`) | \`jq '.pnhSimulation' artifacts/verify/verify-post-summary.json\` |`,
  `| WASM status | ${wasmStatus} | Browser encoder artifact availability (\`available\` or \`unavailable\`) | \`artifacts/verify/verify-post-summary.json\` (\`wasmStatus\`) | \`jq '.wasmStatus' artifacts/verify/verify-post-summary.json\` |`,
  `| Sync date (UTC) | ${formatMaybe(metrics.syncedDateUtc)} | Date written by metrics sync script | \`docs/fire-metrics.json\` (\`syncedDateUtc\`) | \`jq '.syncedDateUtc' docs/fire-metrics.json\` |`,
  "",
  "Re-sync procedure (if any metric shows unknown):",
  "1. Run `pnpm verify:harsh`",
  "2. Confirm expected fields exist in `artifacts/verify/verify-post-summary.json`",
  "3. Run `pnpm fire:sync`",
  "4. Resolution owner: engineering operator on duty",
].join("\n");

const trustBlock = [
  "Data in this document is produced by repository scripts and local verify artifacts.",
  "",
  `- Last verification timestamp from metrics artifact: \`${formatMaybe(metrics.generatedAtUtc)}\``,
  `- Metrics sync date from metrics artifact: \`${formatMaybe(metrics.syncedDateUtc)}\``,
  `- Metrics file hash: \`${metricsHash}\``,
  "- Source file: `docs/fire-metrics.json`",
  "",
  "How to verify independently:",
  "",
  "```bash",
  "sha256sum docs/fire-metrics.json",
  "```",
  "",
  isStale
    ? "If this metadata is stale (older than 24h), run `pnpm fire:sync` before sharing."
    : "Metadata freshness is within 24 hours.",
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

if (mon.value === null) {
  process.stderr.write(
    `sync-external-brief: warning — MON unresolved (source=${mon.source}${mon.raw ? `, raw=${mon.raw}` : ""}); rendered as unknown in brief\n`,
  );
}

process.stderr.write(
  `sync-external-brief: updated docs/AIOM-Technical-Brief.md (stale=${isStale ? "yes" : "no"})\n`,
);
