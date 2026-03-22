#!/usr/bin/env node
/**
 * Refreshes the machine-maintained block in docs/FIRE.md (Vitest counts, Next version, sync time).
 * Narrative / contracts stay in FIRESTARTER.md and FIRE §E–L — edit those by hand when behavior shifts.
 *
 * Usage (repo root):
 *   node scripts/sync-fire-md.mjs
 *   pnpm fire:sync
 *
 * Optional: ALCHEMIST_FIRE_SYNC=1 with pnpm harshcheck / verify:harsh — see run-verify-with-summary.mjs
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
    "",
    "**Commands:** `pnpm fire:sync` · optional `ALCHEMIST_FIRE_SYNC=1` on `pnpm harshcheck` / `pnpm verify:harsh` to refresh after a green run.",
  ].join("\n");
}

function patchFireMd(content, innerMarkdown) {
  const i = content.indexOf(MARK_BEGIN);
  const j = content.indexOf(MARK_END);
  if (i === -1 || j === -1 || j <= i) {
    throw new Error(
      `${MARK_BEGIN} / ${MARK_END} not found in docs/FIRE.md — add ALCHEMIST:FIRE_METRICS markers around the auto block.`
    );
  }
  return (
    content.slice(0, i + MARK_BEGIN.length) +
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
const inner = buildSyncBlock({
  isoDate,
  testCount: engine.testCount,
  fileCount: engine.fileCount,
  nextVersion,
  testFilesOnDisk,
});

const before = readFileSync(firePath, "utf8");
const after = patchFireMd(before, inner);
writeFileSync(firePath, after, "utf8");
process.stderr.write(
  `sync-fire-md: updated docs/FIRE.md (${engine.testCount} tests, Next ${nextVersion})\n`
);
