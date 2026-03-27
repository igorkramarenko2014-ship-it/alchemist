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
const mon = asNumber(verifySummary?.minimumOperatingNumber);
const mon117 = asNumber(verifySummary?.minimumOperatingNumber117);
const monReady = verifySummary?.minimumOperatingReady === true;
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
  "_Machine-synced block — do not edit by hand; run `pnpm fire:sync`._",
  "",
  "| Signal | Value |",
  "|--------|-------|",
  `| Tests Passed | ${formatMaybe(metrics.vitestTestsPassed)} |`,
  `| IOM Coverage | ${iomCoverage === null ? "unknown" : iomCoverage.toFixed(3)} |`,
  `| Minimum Operating Number (MON) | ${mon === null ? "unknown" : mon.toFixed(3)} (MON117=${mon117 === null ? "unknown" : mon117}, ready=${monReady ? "yes" : "no"}) |`,
  `| PNH Immunity Count | ${pnhImmunityCount === null ? "unknown" : pnhImmunityCount} |`,
  `| WASM Status | ${wasmStatus} |`,
  `| Synced (UTC) | ${formatMaybe(metrics.syncedDateUtc)} |`,
  `| Verification Hash (SHA-256) | \`${metricsHash}\` |`,
  "",
  `Canonical metrics source: \`docs/fire-metrics.json\``,
].join("\n");

const trustBlock = [
  isStale
    ? "> [!WARNING]\n> **[DEGRADED DOC STATE]** Metrics are older than 24h. Run `pnpm fire:sync` before sharing this brief externally."
    : "> [!TIP]\n> **Doc Trust State: nominal** — metrics are synced within the last 24h.",
  "",
  `- Last verified UTC: **${formatMaybe(metrics.generatedAtUtc)}**`,
  `- Synced date UTC: **${formatMaybe(metrics.syncedDateUtc)}**`,
  `- Metrics SHA-256: \`${metricsHash}\``,
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

if (mon === null || mon117 === null) {
  process.stderr.write(
    "sync-external-brief: warning — MON fields unavailable in verify_post_summary; rendered as unknown in brief\n",
  );
}

process.stderr.write(
  `sync-external-brief: updated docs/AIOM-Technical-Brief.md (stale=${isStale ? "yes" : "no"})\n`,
);
