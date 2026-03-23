#!/usr/bin/env node
/**
 * Runs verify:harsh or verify:web step-by-step, then emits one auditable JSON line
 * (verify_post_summary) — SOE-style hints only; no hidden state, no "amnesia" of logs.
 *
 * Usage (from repo root):
 *   node scripts/run-verify-with-summary.mjs verify-harsh
 *   node scripts/run-verify-with-summary.mjs verify-web
 *
 * Opt-in faster Vitest (local only): `ALCHEMIST_SELECTIVE_VERIFY=1` skips packages whose
 * paths did not change vs `git merge-base HEAD origin/main` (fallback `HEAD~1`). **Never**
 * used when `CI` is set — CI always runs the full `test:engine` chain.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

function logSummary(payload) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event: "verify_post_summary",
    ...payload,
  });
  process.stderr.write(`${line}\n`);
}

function getChangedPathsFromGit(root) {
  const mb = spawnSync("git", ["merge-base", "HEAD", "origin/main"], {
    cwd: root,
    encoding: "utf8",
  });
  let base = null;
  if (mb.status === 0 && mb.stdout.trim()) {
    base = mb.stdout.trim();
  } else {
    const h1 = spawnSync("git", ["rev-parse", "HEAD~1"], { cwd: root, encoding: "utf8" });
    if (h1.status !== 0 || !h1.stdout.trim()) return null;
    base = h1.stdout.trim();
  }
  const d = spawnSync("git", ["diff", "--name-only", `${base}...HEAD`], {
    cwd: root,
    encoding: "utf8",
  });
  if (d.status !== 0) return null;
  return d.stdout.split(/\r?\n/).filter(Boolean);
}

function runSelectiveEngineTests(root, withPnpm) {
  const wp = (...args) => [process.execPath, withPnpm, ...args];
  const runWp = (argv) => {
    const r = spawnSync(argv[0], argv.slice(1), {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, ALCHEMIST_PNPM_FALLBACK_QUIET: "1" },
      shell: false,
    });
    return r.status === null ? 1 : r.status;
  };
  const changed = getChangedPathsFromGit(root);
  if (!changed || changed.length === 0) {
    process.stderr.write(
      "[alchemist] selective verify: no git diff range — running full test:engine\n"
    );
    return runWp(wp("test:engine"));
  }
  const needEngine = changed.some(
    (f) => f.startsWith("packages/shared-engine/") || f.startsWith("packages/shared-types/")
  );
  const needSerum2 = changed.some((f) => f.startsWith("packages/serum2-encoder/"));
  if (!needEngine && !needSerum2) {
    process.stderr.write(
      "[alchemist] selective verify: skipping Vitest — no changes under shared-engine, shared-types, or serum2-encoder\n"
    );
    return 0;
  }
  if (needEngine) {
    const c = runWp(wp("--filter", "@alchemist/shared-engine", "test"));
    if (c !== 0) return c;
  }
  if (needSerum2) {
    return runWp(wp("--filter", "@alchemist/serum2-encoder", "test"));
  }
  return 0;
}

function soeHint(exitCode, durationMs, mode) {
  if (exitCode !== 0) {
    return "verify_failed: inspect output above; stale Next types → pnpm web:dev:fresh; doctor → pnpm alc:doctor";
  }
  if (durationMs > 180_000) {
    return "soe: long verify wall time — use pnpm verify:harsh for daily iteration; enable CI cache";
  }
  if (mode === "verify-harsh") {
    return "verify_harsh_green: run pnpm harshcheck before release (adds next build)";
  }
  return "verify_web_green: optional pnpm fire:sync (or ALCHEMIST_FIRE_SYNC=1) to refresh docs/FIRE.md metrics; wire triad_run_* + gate metrics into computeSoeRecommendations — read fusionHintCodes / soe_fusion lines for agent-skill–aligned ops hints";
}

function runPipeline(root, mode) {
  const typecheckFilter = "--filter=!@alchemist/mobile-app";
  const withPnpm = join(root, "scripts", "with-pnpm.mjs");
  /** Uses `scripts/with-pnpm.mjs` so verify works when `pnpm` is not on PATH (falls back to npx). */
  const wp = (...pnpmArgs) => [process.execPath, withPnpm, ...pnpmArgs];

  const steps = [
    {
      label: "shared-types:build",
      args: wp("--filter", "@alchemist/shared-types", "build"),
    },
    {
      label: "turbo:typecheck",
      args: wp("exec", "turbo", "run", "typecheck", typecheckFilter),
    },
    {
      label: "test:engine",
      args: wp("test:engine"),
    },
  ];

  if (mode === "verify-web") {
    steps.push({
      label: "turbo:build:web-app",
      // Concurrency 1: parallel fxp-encoder (wasm) + shared-types builds have been linked to
      // flaky Next "Collecting page data" failures (missing ./NNN.js, /_document) on some machines.
      args: wp(
        "exec",
        "turbo",
        "run",
        "build",
        "--filter=@alchemist/web-app",
        "--concurrency=1"
      ),
    });
  }

  const selective =
    process.env.ALCHEMIST_SELECTIVE_VERIFY === "1" && !process.env.CI;

  for (const { label, args } of steps) {
    if (label === "test:engine" && selective) {
      const code = runSelectiveEngineTests(root, withPnpm);
      if (code !== 0) {
        return { exitCode: code, failedStep: label };
      }
      continue;
    }
    const r = spawnSync(args[0], args.slice(1), {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, ALCHEMIST_PNPM_FALLBACK_QUIET: "1" },
      shell: false,
    });
    const code = r.status === null ? 1 : r.status;
    if (code !== 0) {
      return { exitCode: code, failedStep: label };
    }
  }
  return { exitCode: 0, failedStep: null };
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
const mode = process.argv[2];

if (!root) {
  logSummary({ error: "monorepo_root_not_found", exitCode: 1 });
  process.exit(1);
}

if (mode !== "verify-harsh" && mode !== "verify-web") {
  process.stderr.write(
    `Usage: node scripts/run-verify-with-summary.mjs <verify-harsh|verify-web>\n`
  );
  process.exit(1);
}

const t0 = Date.now();
const { exitCode, failedStep } = runPipeline(root, mode);
const durationMs = Date.now() - t0;

logSummary({
  mode,
  exitCode,
  durationMs,
  failedStep,
  monorepoRoot: root,
  selectiveVerify:
    process.env.ALCHEMIST_SELECTIVE_VERIFY === "1" && !process.env.CI ? true : undefined,
  soeHint: soeHint(exitCode, durationMs, mode),
  note:
    "Auditable post-verify line — not a hidden brain; pipe stderr to your log store for SOE inputs.",
});

if (process.env.ALCHEMIST_FIRE_SYNC === "1" && exitCode === 0) {
  const syncScript = join(root, "scripts", "sync-fire-md.mjs");
  const sync = spawnSync(process.execPath, [syncScript], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env },
    shell: false,
  });
  const sc = sync.status === null ? 1 : sync.status;
  if (sc !== 0) {
    process.stderr.write(
      "[alchemist] ALCHEMIST_FIRE_SYNC=1: sync-fire-md.mjs failed — docs/FIRE.md metrics not updated\n"
    );
  }
}

process.exit(exitCode);
