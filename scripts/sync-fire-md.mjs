#!/usr/bin/env node
/**
 * Refreshes machine-maintained metric blocks in docs/FIRE.md
 * (Vitest counts, Next version, sync time).
 * Narrative / contracts stay in FIRESTARTER.md and FIRE §E–L — edit those by hand when behavior shifts.
 *
 * Usage (repo root):
 *   node scripts/sync-fire-md.mjs
 *   pnpm fire:sync
 *
 * Optional: ALCHEMIST_FIRE_SYNC=1 with pnpm harshcheck / verify:harsh — see run-verify-with-summary.mjs
 *
 * Also writes **docs/fire-metrics.json** (+ **docs/fire-metrics.sha256**, GNU `sha256sum -c` form from repo root)
 * so auditors and CI can treat one JSON as canonical metrics; Markdown tables stay human-facing mirrors.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findVst3BuildBundlePath } from "./lib/vst-bundle-resolve.mjs";

/** Must not appear elsewhere in FIRE.md (intro prose used to duplicate this and broke `indexOf`). */
const MARK_BEGIN = "<!-- ALCHEMIST:FIRE_METRICS:BEGIN -->";
const MARK_END = "<!-- ALCHEMIST:FIRE_METRICS:END -->";

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

function countEngineTestFiles(root) {
  const base = join(root, "packages", "shared-engine", "tests");
  if (!existsSync(base)) return 0;
  let n = 0;
  const stack = [base];
  while (stack.length) {
    const d = stack.pop();
    for (const ent of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.name.endsWith(".test.ts")) n += 1;
    }
  }
  return n;
}

function readNextVersion(root) {
  const p = join(root, "apps", "web-app", "package.json");
  if (!existsSync(p)) return "unknown";
  try {
    const j = JSON.parse(readFileSync(p, "utf8"));
    return typeof j.dependencies?.next === "string" ? j.dependencies.next : "unknown";
  } catch {
    return "unknown";
  }
}

function runEngineTests(root) {
  const withPnpm = join(root, "scripts", "with-pnpm.mjs");
  const r = spawnSync(process.execPath, [withPnpm, "test:engine"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ALCHEMIST_PNPM_FALLBACK_QUIET: "1" },
    shell: false,
  });
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const tests = out.match(/Tests\s+(\d+)\s+passed/);
  const files = out.match(/Test Files\s+(\d+)\s+passed/);
  const ok = r.status === 0 && tests && files;
  return {
    ok,
    testCount: tests ? Number(tests[1]) : null,
    fileCount: files ? Number(files[1]) : null,
    exitCode: r.status === null ? 1 : r.status,
  };
}

function readTruthMatrix(root) {
  const p = join(root, "artifacts", "truth-matrix.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function buildSyncBlock({ isoDate, testCount, fileCount, nextVersion, testFilesOnDisk }) {
  const tc = testCount ?? "—";
  const fc = fileCount ?? "—";
  const tfd = testFilesOnDisk ?? "—";
  const nv = nextVersion ?? "unknown";
  return [
    "_Machine block — do not edit by hand; run `pnpm fire:sync`._",
    "",
    "| Signal | Value |",
    "|--------|-------|",
    `| **Synced (UTC)** | **${isoDate}** |`,
    `| **Vitest** (\`@alchemist/shared-engine\`) | **${tc}** tests passed, **${fc}** files (runner) · **${tfd}** \`*.test.ts\` on disk |`,
    `| **Next.js** (\`apps/web-app\`) | **${nv}** (\`dependencies.next\`) |`,
    "| **Canonical metrics JSON** | `docs/fire-metrics.json` — verify: `sha256sum -c docs/fire-metrics.sha256` (repo root) |",
    "",
    "**Commands:** `pnpm fire:sync` · optional `ALCHEMIST_FIRE_SYNC=1` on `pnpm harshcheck` / `pnpm verify:harsh` to refresh after a green run.",
  ].join("\n");
}

/**
 * Single machine-readable snapshot (auditors / LLM tools). Hash covers exact file bytes on disk.
 */
/** macOS **`.vst3`** bundle: hash first file under **`Contents/MacOS`** (main binary). */
function sha256VstBundleMainBinary(bundlePath) {
  try {
    const macos = join(bundlePath, "Contents", "MacOS");
    if (!existsSync(macos)) return null;
    const files = readdirSync(macos);
    if (!files.length) return null;
    const binPath = join(macos, files[0]);
    const buf = readFileSync(binPath);
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

function writeFireMetricsArtifacts(
  root,
  {
    isoDate,
    testCount,
    fileCount,
    nextVersion,
    testFilesOnDisk,
    vst3BundlePresent,
    vst3BundleBasename,
    vst3MainBinarySha256,
    truthMatrix,
  }
) {
  let initiationStatus = null;
  let initiatorSkillsSha256 = null;
  try {
    const p = join(root, "artifacts", "initiator", "skills-117-manifest.json");
    if (existsSync(p)) {
      const mRaw = readFileSync(p, "utf8");
      const m = JSON.parse(mRaw);
      initiationStatus = typeof m?.initiationStatus === "string" ? m.initiationStatus : null;
      initiatorSkillsSha256 = createHash("sha256").update(mRaw).digest("hex");
    }
  } catch {
    initiationStatus = null;
    initiatorSkillsSha256 = null;
  }
  const tmMetrics =
    truthMatrix?.metrics && typeof truthMatrix.metrics === "object" ? truthMatrix.metrics : {};
  const monResolved = {
    mon117:
      typeof tmMetrics.mon117 === "number" && Number.isFinite(tmMetrics.mon117)
        ? tmMetrics.mon117
        : null,
    monReady: tmMetrics.monReady === true,
    monSource: typeof tmMetrics.monSource === "string" ? tmMetrics.monSource : "unresolved",
    monRawStatus: typeof tmMetrics.monRawStatus === "string" ? tmMetrics.monRawStatus : null,
  };
  const payload = {
    schemaVersion: 1,
    syncedDateUtc: isoDate,
    generatedAtUtc: new Date().toISOString(),
    vitestTestsPassed: testCount,
    vitestTestFilesPassed: fileCount,
    vitestTestTsOnDisk: testFilesOnDisk,
    nextJsVersion: nextVersion,
    vst3BundlePresent,
    vst3BundleBasename,
    vst3MainBinarySha256,
    initiationStatus,
    mon117: monResolved.mon117,
    monReady: monResolved.monReady,
    monSource: monResolved.monSource,
    ...(monResolved.monRawStatus != null ? { monRawStatus: monResolved.monRawStatus } : {}),
    initiatorSkillsSha256,
    note: "Generated file — edits will be overwritten on next pnpm fire:sync. Verify contents via jq and sha256sum commands in AIOM-Technical-Brief.md.",
  };
  payload.divergences = Array.isArray(truthMatrix?.divergences) ? truthMatrix.divergences : [];
  const jsonPath = join(root, "docs", "fire-metrics.json");
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(jsonPath, body, "utf8");
  const digest = createHash("sha256").update(body).digest("hex");
  const shaPath = join(root, "docs", "fire-metrics.sha256");
  writeFileSync(shaPath, `${digest}  docs/fire-metrics.json\n`, "utf8");
}

function patchMarkedBlock(content, beginMark, endMark, innerMarkdown, labelForError) {
  const i = content.indexOf(beginMark);
  const j = content.indexOf(endMark);
  if (i === -1 || j === -1 || j <= i) {
    throw new Error(
      `${beginMark} / ${endMark} not found in ${labelForError} — add matching HTML comment markers around the auto block.`
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

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  console.error("sync-fire-md: monorepo root not found");
  process.exit(1);
}

const firePath = join(root, "docs", "FIRE.md");
if (!existsSync(firePath)) {
  console.error(`sync-fire-md: missing ${firePath}`);
  process.exit(1);
}

const truthMatrix = readTruthMatrix(root);
if (!truthMatrix || typeof truthMatrix !== "object") {
  console.error(
    "sync-fire-md: missing artifacts/truth-matrix.json — run pnpm truth:aggregate or pnpm truth:build first.",
  );
  process.exit(1);
}

const engine = runEngineTests(root);
if (!engine.ok) {
  console.error(
    "sync-fire-md: shared-engine Vitest did not pass — fix tests before syncing FIRE metrics."
  );
  if (engine.exitCode !== 0) console.error(`sync-fire-md: exit code ${engine.exitCode}`);
  process.exit(1);
}

const testFilesOnDisk = countEngineTestFiles(root);
const nextVersion = readNextVersion(root);
const isoDate = new Date().toISOString().slice(0, 10);
const vstBundlePath = findVst3BuildBundlePath(root);
const vst3BundlePresent = Boolean(vstBundlePath);
const vst3BundleBasename = vstBundlePath ? basename(vstBundlePath) : null;
const vst3MainBinarySha256 = vstBundlePath ? sha256VstBundleMainBinary(vstBundlePath) : null;
const inner = buildSyncBlock({
  isoDate,
  testCount: engine.testCount,
  fileCount: engine.fileCount,
  nextVersion,
  testFilesOnDisk,
});

writeFireMetricsArtifacts(root, {
  isoDate,
  testCount: engine.testCount,
  fileCount: engine.fileCount,
  nextVersion,
  testFilesOnDisk,
  vst3BundlePresent,
  vst3BundleBasename,
  vst3MainBinarySha256,
  truthMatrix,
});
process.stderr.write("sync-fire-md: wrote docs/fire-metrics.json + docs/fire-metrics.sha256\n");

const beforeFire = readFileSync(firePath, "utf8");
const afterFire = patchMarkedBlock(beforeFire, MARK_BEGIN, MARK_END, inner, "docs/FIRE.md");
writeFileSync(firePath, afterFire, "utf8");
process.stderr.write(
  `sync-fire-md: updated docs/FIRE.md (${engine.testCount} tests, Next ${nextVersion})\n`
);

