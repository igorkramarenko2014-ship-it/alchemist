#!/usr/bin/env node
/**
 * Runs verify:harsh or verify:web step-by-step, then emits one auditable JSON line
 * (verify_post_summary) — SOE-style hints only; no hidden state, no "amnesia" of logs.
 *
 * Usage (from repo root):
 *   node scripts/run-verify-with-summary.mjs verify-harsh
 *   node scripts/run-verify-with-summary.mjs verify-web
 *
 * Brain fusion: `docs/brain.md` §9a JSON block → `packages/shared-engine/brain-fusion-calibration.gen.ts`.
 * First step runs `sync-brain-fusion.mjs --check` (run `pnpm brain:sync` after editing §9a).
 * Igor orchestrator: `sync-igor-orchestrator.mjs --check` validates `igor-orchestrator-packages.gen.ts`
 * and `igor-orchestrator-cells.gen.ts` (run `pnpm igor:sync` after workspace churn or edits to
 * `igor-orchestrator-meta.json` / `igor-power-cells.json`).
 * Optional after green verify: `ALCHEMIST_BRAIN_SYNC=1` regenerates `.gen.ts` (like `ALCHEMIST_FIRE_SYNC`).
 *
 * Opt-in faster Vitest (local only): `ALCHEMIST_SELECTIVE_VERIFY=1` skips packages whose
 * paths did not change vs `git merge-base HEAD origin/main` (fallback `HEAD~1`). **Never**
 * used when `CI` is set — CI always runs the full `test:engine` chain.
 *
 * When `shared-engine` sources changed, **IOM cell hints** (`igor-power-cells.json`) map
 * touched artifacts → Vitest files; unmatched `.ts` changes fall back to the full engine suite.
 *
 * **PNH** (Predictive Network Hardening): deterministic probes in `packages/shared-engine/pnh/` run with
 * `pnpm test:engine` (`tests/pnh-ghost-run.test.ts`); quick slice: `pnpm pnh:ghost`.
 * Nine-sequence model + `pnh-report.json`: `pnpm pnh:model-warfare` (optional `--strict`).
 * **Red-team simulation** (`pnpm pnh:simulate`): ghost + warfare + APT ledger + stub intent; on green
 * **`verify-harsh`**, runs automatically and sets **`pnhStatus`** (string, legacy), **`pnhSecurityPosture`**
 * (**`state`**, **`highSeverityCount`**, **`scenariosTriggered`**, **`failureDetails`**), **`securityVerdict`**
 * (`pass` \| `degraded` \| `fail` \| **`null`** when PNH not evaluated), and **`pnhSecurityMessages`** on
 * **`verify_post_summary`**. **CI** (`CI=1`): **`--ci`** fails on breach; fails on warning tier unless
 * **`ALCHEMIST_PNH_ALLOW_WARNING=1`** (escape hatch). Local **`verify-harsh`** runs simulation without **`--ci`**
 * so medium drift does not block iteration.
 *
 * Optional **VST3 sidecar** (strict): `ALCHEMIST_VST_VERIFY=1` after a green pipeline runs
 * `REQUIRE_VST=1 assert:vst` then `pnpm vst:observe:gate` (HARD GATE preflight). No default in CI.
 *
 * **`verify_post_summary`** always includes **`iomCoverageScore`** (0–1 power-cell test map coverage),
 * **`uncoveredCells[]`**, **`iomCoveredCellCount`**, **`iomPowerCellTotal`**, **`iomUnmappedCellIds`**.
 * After a green or failed run, **`tsx scripts/iom-verify-iom-meta.ts`** adds **`iomActiveSchisms`**,
 * **`iomHealthVerdict`**, **`recommendedNext`**, **`iomPendingProposalCount`**, **`iomSoeHintHead`** (offline pulse),
 * and **`iomEngineHeuristic`** (replacement-cost slice — same as **`pnpm estimate`**; descriptive only).
 * Selective partial runs also set **`iomVitestBreadthScore`** (fraction of engine test files executed).
 *
 * **`wasmArtifactTruth`** + **`wasmBrowserFxpEncodeReady`** (from `lib/wasm-artifact-truth.mjs`):
 * filesystem classification of `packages/fxp-encoder/pkg` — **not** a substitute for
 * `REQUIRE_WASM=1 pnpm assert:wasm` before shipping browser `.fxp`; default verify stays green without Rust.
 *
 * **`hardGate*Present`** (from `lib/hard-gate-files-truth.mjs`): offset map file, Python script, sample `.fxp`
 * on disk — **not** a substitute for `pnpm assert:hard-gate` / `validate-offsets.py` success.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeIomCoverageReport,
  IOM_CELL_VITEST_FILES,
} from "./lib/iom-coverage-report.mjs";
import { getHardGateFilesTruth } from "./lib/hard-gate-files-truth.mjs";
import { getWasmArtifactTruthForSummary } from "./lib/wasm-artifact-truth.mjs";

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

function readGitMeta(root) {
  const sha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  const branch = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  return {
    gitSha: sha.status === 0 ? sha.stdout.trim() : "unknown",
    gitBranch: branch.status === 0 ? branch.stdout.trim() : "unknown",
  };
}

function buildTriadPanelistModeExpected() {
  const hasDeepseek = Boolean(process.env.DEEPSEEK_API_KEY);
  const hasLlama = Boolean(process.env.GROQ_API_KEY || process.env.LLAMA_API_KEY);
  const hasQwen = Boolean(process.env.QWEN_API_KEY);
  const toMode = (live) => (live ? "fetcher" : "stub");
  return {
    DEEPSEEK: toMode(hasDeepseek),
    LLAMA: toMode(hasLlama),
    QWEN: toMode(hasQwen),
  };
}

/**
 * Durable release artifact: same JSON as the stderr **`verify_post_summary`** line (includes **`ts`**, **`event`**).
 * Writes **`artifacts/verify/`** and **`.artifacts/verify/`** (CI may upload either tree).
 */
function writeVerifyPostSummaryArtifacts(root, lineObj) {
  const text = `${JSON.stringify(lineObj, null, 2)}\n`;
  const primary = join(root, "artifacts", "verify");
  const secondary = join(root, ".artifacts", "verify");
  mkdirSync(primary, { recursive: true });
  mkdirSync(secondary, { recursive: true });
  const sha = typeof lineObj.gitSha === "string" ? lineObj.gitSha : "unknown";
  const postSummaryPrimary = join(primary, "verify-post-summary.json");
  const postSummarySecondary = join(secondary, "verify-post-summary.json");
  const stamped = join(primary, `verify-receipt-${sha}.json`);
  const latest = join(primary, "verify-receipt-latest.json");
  writeFileSync(postSummaryPrimary, text, "utf8");
  writeFileSync(postSummarySecondary, text, "utf8");
  writeFileSync(stamped, text, "utf8");
  writeFileSync(latest, text, "utf8");
  return {
    verifyPostSummaryPath: postSummaryPrimary,
    verifyPostSummaryDotArtifactsPath: postSummarySecondary,
    verifyReceiptPath: stamped,
    verifyReceiptLatestPath: latest,
  };
}

/** Offline IOM meta via **`tsx`** (shared-engine is TS-only). */
function collectIomVerifyMeta(root) {
  const withPnpm = join(root, "scripts", "with-pnpm.mjs");
  const script = join(root, "scripts", "iom-verify-iom-meta.ts");
  const r = spawnSync(
    process.execPath,
    [withPnpm, "exec", "tsx", script],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, ALCHEMIST_PNPM_FALLBACK_QUIET: "1" },
      shell: false,
    },
  );
  if (r.status !== 0) {
    return {
      iomActiveSchisms: null,
      iomHealthVerdict: null,
      recommendedNext: null,
      iomPendingProposalCount: null,
      iomSoeHintHead: null,
      iomVerifyPulseMetaError: (r.stderr || r.stdout || "tsx_iom_meta_failed").trim().slice(0, 400),
    };
  }
  try {
    const line = (r.stdout || "").trim().split("\n").filter(Boolean).pop();
    return line ? JSON.parse(line) : {};
  } catch (e) {
    return { iomVerifyPulseMetaError: String(e).slice(0, 400) };
  }
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

function loadIgorPowerCells(root) {
  const p = join(root, "packages", "shared-engine", "igor-power-cells.json");
  if (!existsSync(p)) return null;
  try {
    const cells = JSON.parse(readFileSync(p, "utf8"));
    return Array.isArray(cells) ? cells : null;
  } catch {
    return null;
  }
}

/** Collect every `tests` `.test.ts` file path relative to `packages/shared-engine/`. */
function collectAllEngineTestRelPaths(engineRoot) {
  const testsDir = join(engineRoot, "tests");
  const out = [];
  function walk(dir, prefix) {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
      const abs = join(dir, ent.name);
      if (ent.isDirectory()) walk(abs, rel);
      else if (ent.isFile() && ent.name.endsWith(".test.ts")) {
        out.push(`tests/${rel.split("\\").join("/")}`);
      }
    }
  }
  walk(testsDir, "");
  return [...new Set(out)].sort();
}

function withIomCoverage(root, executedVitestRelPaths, baseMeta) {
  const cells = loadIgorPowerCells(root);
  if (!cells) return baseMeta ?? {};
  const cov = computeIomCoverageReport(cells, executedVitestRelPaths ?? []);
  return { ...(baseMeta ?? {}), ...cov };
}

function buildIomPartialSummary(root, plan) {
  const engineRoot = join(root, "packages", "shared-engine");
  const allTests = collectAllEngineTestRelPaths(engineRoot);
  const ranSet = new Set(plan.vitestArgs);
  const skipped = allTests.filter((t) => !ranSet.has(t));
  const score = allTests.length
    ? Math.round((plan.vitestArgs.length / allTests.length) * 1000) / 1000
    : null;
  const cellPart = plan.matchedCellIds?.length
    ? `Cells linked from git diff: [${plan.matchedCellIds.join(", ")}]. `
    : "";
  const skipPreview = skipped.slice(0, 12);
  const ell = skipped.length > 12 ? " …" : "";
  const base = {
    iomSelectiveEngineMode: "partial_iom_mapped",
    iomVitestBreadthScore: score,
    iomMatchedCellIds: plan.matchedCellIds,
    iomRanVitestFileCount: plan.vitestArgs.length,
    iomEngineTestFileTotal: allTests.length,
    iomSkippedVitestFilesSample: skipPreview,
    iomSkippedVitestFileCount: skipped.length,
    iomSelectiveWarnings: [
      `${cellPart}Local selective IOM Vitest ran ${plan.vitestArgs.length}/${allTests.length} files (vitest breadth score=${score}). Not executed include: ${skipPreview.join(", ")}${ell}. Run full pnpm verify:harsh or pnpm harshcheck before merge.`,
    ],
  };
  return withIomCoverage(root, plan.vitestArgs, base);
}

/**
 * @returns {{ kind: "full"; matchedCellIds: string[] } | { kind: "partial"; vitestArgs: string[]; matchedCellIds: string[] }}
 */
function iomSelectiveVitestPlan(root, changed) {
  const enginePrefix = "packages/shared-engine/";
  const tsUnderEngine = changed.filter(
    (f) =>
      f.startsWith(enginePrefix) &&
      f.endsWith(".ts") &&
      !f.endsWith(".test.ts") &&
      !f.endsWith(".gen.ts") &&
      !f.includes("/tests/")
  );
  const relSources = tsUnderEngine.map((f) => f.slice(enginePrefix.length).split("\\").join("/"));

  if (relSources.length === 0) {
    return { kind: "full", matchedCellIds: [] };
  }

  const cells = loadIgorPowerCells(root);
  if (!cells) {
    return { kind: "full", matchedCellIds: [] };
  }

  const matchedIds = new Set();
  for (const rel of relSources) {
    for (const cell of cells) {
      if (!cell || typeof cell !== "object" || typeof cell.id !== "string") continue;
      const arts = cell.artifacts;
      if (!Array.isArray(arts)) continue;
      if (arts.some((a) => typeof a === "string" && a.split("\\").join("/") === rel)) {
        matchedIds.add(cell.id);
      }
    }
  }

  if (matchedIds.size === 0) {
    return { kind: "full", matchedCellIds: [] };
  }

  const vitestRel = new Set(["tests/igor-orchestrator-layer.test.ts"]);
  for (const id of matchedIds) {
    const files = IOM_CELL_VITEST_FILES[id];
    if (!files || files.length === 0) {
      return { kind: "full", matchedCellIds: [] };
    }
    for (const t of files) vitestRel.add(t);
  }

  const engineRoot = join(root, "packages", "shared-engine");
  const vitestArgs = [];
  for (const rel of vitestRel) {
    const abs = join(engineRoot, ...rel.split("/"));
    if (!existsSync(abs)) {
      return { kind: "full", matchedCellIds: [] };
    }
    vitestArgs.push(rel);
  }
  vitestArgs.sort();
  return {
    kind: "partial",
    vitestArgs,
    matchedCellIds: [...matchedIds].sort(),
  };
}

function runSelectiveEngineTests(root, withPnpm) {
  const engineRoot = join(root, "packages", "shared-engine");
  const allEngineTests = () => collectAllEngineTestRelPaths(engineRoot);

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

  const fullEngineOkBase = {
    iomSelectiveEngineMode: "full_engine_selective_path",
    iomSelectiveWarnings: [],
  };

  const changed = getChangedPathsFromGit(root);
  if (!changed || changed.length === 0) {
    process.stderr.write(
      "[alchemist] selective verify: no git diff range — running full test:engine\n"
    );
    const c = runWp(wp("test:engine"));
    if (c === 0) {
      return {
        code: 0,
        iom: withIomCoverage(root, allEngineTests(), {
          ...fullEngineOkBase,
          iomSelectiveEngineMode: "full_engine_no_git_range",
        }),
      };
    }
    return {
      code: c,
      iom: withIomCoverage(root, allEngineTests(), {
        iomSelectiveEngineMode: "full_engine_no_git_range_failed",
        iomSelectiveWarnings: ["Selective verify: full test:engine failed — see output above."],
      }),
    };
  }
  const needEngine = changed.some(
    (f) => f.startsWith("packages/shared-engine/") || f.startsWith("packages/shared-types/")
  );
  const needSerum2 = changed.some((f) => f.startsWith("packages/serum2-encoder/"));
  if (!needEngine && !needSerum2) {
    process.stderr.write(
      "[alchemist] selective verify: skipping Vitest — no changes under shared-engine, shared-types, or serum2-encoder\n"
    );
    return {
      code: 0,
      iom: withIomCoverage(root, [], {
        iomSelectiveEngineMode: "vitest_skipped_no_package_diff",
        iomSelectiveWarnings: [
          "Selective verify: Vitest skipped — no changes under packages/shared-engine, packages/shared-types, or packages/serum2-encoder in git range.",
        ],
      }),
    };
  }
  if (needEngine) {
    const plan = iomSelectiveVitestPlan(root, changed);
    if (plan.kind === "partial") {
      process.stderr.write(
        `[alchemist] selective verify: IOM-targeted Vitest (${plan.vitestArgs.length} files)\n`
      );
      const partialMeta = buildIomPartialSummary(root, plan);
      const c = runWp([
        process.execPath,
        withPnpm,
        "--filter",
        "@alchemist/shared-engine",
        "exec",
        "vitest",
        "run",
        ...plan.vitestArgs,
      ]);
      if (c !== 0) {
        return {
          code: c,
          iom: withIomCoverage(root, plan.vitestArgs, {
            ...partialMeta,
            iomSelectiveEngineMode: "partial_iom_mapped_failed",
            iomSelectiveWarnings: [
              ...partialMeta.iomSelectiveWarnings,
              "Selective verify: IOM-targeted Vitest failed — see output above.",
            ],
          }),
        };
      }
      return { code: c, iom: partialMeta };
    }
    process.stderr.write(
      "[alchemist] selective verify: full shared-engine Vitest (no IOM cell match or unmapped cell)\n"
    );
    const c = runWp(wp("--filter", "@alchemist/shared-engine", "test"));
    if (c === 0) {
      return {
        code: 0,
        iom: withIomCoverage(root, allEngineTests(), {
          ...fullEngineOkBase,
          iomSelectiveEngineMode: "full_engine_iom_fallback_or_unmapped",
        }),
      };
    }
    return {
      code: c,
      iom: withIomCoverage(root, allEngineTests(), {
        iomSelectiveEngineMode: "full_engine_iom_fallback_failed",
        iomSelectiveWarnings: ["Selective verify: full shared-engine Vitest failed — see output above."],
      }),
    };
  }
  if (needSerum2) {
    const c = runWp(wp("--filter", "@alchemist/serum2-encoder", "test"));
    return {
      code: c,
      iom: withIomCoverage(root, [], {
        iomSelectiveEngineMode: "serum2_encoder_only",
        iomSelectiveWarnings:
          c === 0
            ? ["Selective verify: only serum2-encoder tests ran; shared-engine Vitest was not in scope for this diff."]
            : ["Selective verify: serum2-encoder tests failed — see output above."],
      }),
    };
  }
  return { code: 0, iom: withIomCoverage(root, allEngineTests(), fullEngineOkBase) };
}

function soeHint(exitCode, durationMs, mode, iomMeta) {
  if (exitCode !== 0) {
    return "verify_failed: inspect output above; stale Next types → pnpm web:dev:fresh; doctor → pnpm alc:doctor";
  }
  let base;
  if (durationMs > 180_000) {
    base =
      "soe: long verify wall time — use pnpm verify:harsh for daily iteration; enable CI cache";
  } else if (mode === "verify-harsh") {
    base = "verify_harsh_green: run pnpm harshcheck before release (adds next build)";
  } else {
    base =
      "verify_web_green: optional pnpm fire:sync (or ALCHEMIST_FIRE_SYNC=1) to refresh docs/FIRE.md metrics; wire triad_run_* + gate metrics into computeSoeRecommendations — read fusionHintCodes / soe_fusion lines for agent-skill–aligned ops hints";
  }
  if (!iomMeta) return base;
  const score = iomMeta.iomCoverageScore;
  const uncovered = iomMeta.uncoveredCells;
  const lowCov = typeof score === "number" && score < 0.85;
  const hasUncovered = Array.isArray(uncovered) && uncovered.length > 0;
  if (!lowCov && !hasUncovered) return base;
  const parts = [];
  if (lowCov) parts.push(`iomCoverageScore=${score} (<0.85)`);
  if (hasUncovered) {
    const sample = uncovered.slice(0, 10).join(", ");
    parts.push(
      `uncoveredCells: ${sample}${uncovered.length > 10 ? " …" : ""} (${uncovered.length} total)`
    );
  }
  return `${base} | soe_iom_verify: ${parts.join("; ")} — extend Vitest mapping in packages/shared-engine/iom-coverage.ts (keep sync with scripts/lib/iom-coverage-report.mjs).`;
}

function runPipeline(root, mode) {
  const typecheckFilter = "--filter=!@alchemist/mobile-app";
  const withPnpm = join(root, "scripts", "with-pnpm.mjs");
  /** Uses `scripts/with-pnpm.mjs` so verify works when `pnpm` is not on PATH (falls back to npx). */
  const wp = (...pnpmArgs) => [process.execPath, withPnpm, ...pnpmArgs];

  /** @type {Record<string, unknown> | undefined} */
  let iomVerifyMeta;

  const steps = [
    {
      label: "brain:fusion-sync",
      args: [process.execPath, join(root, "scripts", "sync-brain-fusion.mjs"), "--check"],
    },
    {
      label: "igor:orchestrator-sync",
      args: [process.execPath, join(root, "scripts", "sync-igor-orchestrator.mjs"), "--check"],
    },
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
    {
      label: "triad:concurrency-stress",
      args: wp("--filter", "@alchemist/shared-engine", "exec", "vitest", "run", "tests/triad-concurrency.test.ts"),
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
      const res = runSelectiveEngineTests(root, withPnpm);
      iomVerifyMeta = res.iom;
      if (res.code !== 0) {
        return { exitCode: res.code, failedStep: label, iomVerifyMeta };
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
    if (label === "test:engine") {
      const engineRoot = join(root, "packages", "shared-engine");
      const allT = collectAllEngineTestRelPaths(engineRoot);
      if (code === 0) {
        iomVerifyMeta = withIomCoverage(root, allT, {
          iomSelectiveEngineMode: process.env.CI ? "full_ci" : "full_local",
          iomSelectiveWarnings: [],
        });
      } else {
        iomVerifyMeta = withIomCoverage(root, allT, {
          iomSelectiveEngineMode: "full_engine_failed",
          iomSelectiveWarnings: ["test:engine failed — see output above."],
        });
      }
    }
    if (code !== 0) {
      return { exitCode: code, failedStep: label, iomVerifyMeta };
    }
  }
  return { exitCode: 0, failedStep: null, iomVerifyMeta };
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
const mode = process.argv[2];

if (!root) {
  logSummary({ error: "monorepo_root_not_found", exitCode: 1 });
  process.exit(1);
}

/** PNH `--ci` (fail on warning tier) only on GitHub Actions or when explicitly opted in — not generic `CI=1` (Cursor/sandboxes). */
const pnhCiStrict =
  process.env.GITHUB_ACTIONS === "true" || process.env.ALCHEMIST_PNH_CI === "1";

if (mode !== "verify-harsh" && mode !== "verify-web") {
  process.stderr.write(
    `Usage: node scripts/run-verify-with-summary.mjs <verify-harsh|verify-web>\n`
  );
  process.exit(1);
}

const t0 = Date.now();
const { exitCode, failedStep, iomVerifyMeta } = runPipeline(root, mode);
let finalExitCode = exitCode;
if (exitCode === 0 && process.env.ALCHEMIST_VST_VERIFY === "1") {
  const withPnpm = join(root, "scripts", "with-pnpm.mjs");
  const assertScript = join(root, "scripts", "assert-vst-available.mjs");
  const a = spawnSync(process.execPath, [assertScript], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      REQUIRE_VST: "1",
      ALCHEMIST_REQUIRE_VST: "1",
      ALCHEMIST_PNPM_FALLBACK_QUIET: "1",
    },
    shell: false,
  });
  const acode = a.status === null ? 1 : a.status;
  if (acode !== 0) {
    finalExitCode = acode;
    process.stderr.write(
      "[alchemist] ALCHEMIST_VST_VERIFY=1: assert:vst failed — run pnpm build:vst or unset ALCHEMIST_VST_VERIFY\n"
    );
  } else {
    const g = spawnSync(process.execPath, [withPnpm, "vst:observe:gate"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, ALCHEMIST_PNPM_FALLBACK_QUIET: "1" },
      shell: false,
    });
    const gcode = g.status === null ? 1 : g.status;
    if (gcode !== 0) {
      finalExitCode = gcode;
      process.stderr.write(
        "[alchemist] ALCHEMIST_VST_VERIFY=1: vst:observe:gate failed — offset / HARD GATE preflight\n"
      );
    }
  }
}

function readPnhSimulationLast(r) {
  const p = join(r, "tools", "pnh-simulation-last.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function securityVerdictFromPnhStateJs(state) {
  if (state === "clean") return "pass";
  if (state === "warning") return "degraded";
  if (state === "breach") return "fail";
  return null;
}

/**
 * PNH verify-truth rollup for **`verify_post_summary`** — never treats stale **`last.json`** as fresh when sim did not run.
 */
function buildPnhSecurityRollup({ mode, pnhSimInvoked, pnhLast }) {
  if (mode !== "verify-harsh") {
    const detail =
      "PNH security posture is evaluated on verify-harsh only. Re-run pnpm verify:harsh for pnhSecurityPosture / securityVerdict.";
    return {
      pnhSecurityPosture: {
        state: "skipped",
        highSeverityCount: 0,
        mediumSeverityFailCount: 0,
        scenariosTriggered: [],
        failureDetails: [
          {
            id: "pnh:not_applicable",
            suite: "verify",
            severity: "info",
            location: "run-verify-with-summary.mjs :: verify-web",
            detail,
            message: `[INFO] run-verify-with-summary.mjs :: verify-web — ${detail}`,
          },
        ],
      },
      securityVerdict: null,
      pnhSecurityMessages: [],
    };
  }
  if (!pnhSimInvoked) {
    const detail =
      "PNH simulation did not run (a prior verify-harsh step failed). tools/pnh-simulation-last.json is unchanged and may be stale — do not treat pnhStatus as current.";
    return {
      pnhSecurityPosture: {
        state: "skipped",
        highSeverityCount: 0,
        mediumSeverityFailCount: 0,
        scenariosTriggered: [],
        failureDetails: [
          {
            id: "pnh:not_run",
            suite: "verify",
            severity: "info",
            location: "run-verify-with-summary.mjs :: verify-harsh",
            detail,
            message: `[INFO] verify :: pnh:not_run — ${detail}`,
          },
        ],
      },
      securityVerdict: null,
      pnhSecurityMessages: [],
    };
  }
  const vt = pnhLast?.verifyTruth;
  if (!vt) {
    const st = typeof pnhLast?.pnhStatus === "string" ? pnhLast.pnhStatus : "unknown";
    return {
      pnhSecurityPosture: {
        state: st,
        highSeverityCount: 0,
        mediumSeverityFailCount: 0,
        scenariosTriggered: [],
        failureDetails: [
          {
            id: "pnh:artifact_incomplete",
            suite: "tools",
            severity: "info",
            location: "tools/pnh-simulation-last.json",
            detail:
              "Missing verifyTruth — run pnpm pnh:simulate on current scripts/pnh-simulate.ts after upgrade.",
            message:
              "[INFO] tools/pnh-simulation-last.json — missing verifyTruth; run pnpm pnh:simulate",
          },
        ],
      },
      securityVerdict: securityVerdictFromPnhStateJs(st),
      pnhSecurityMessages: [],
    };
  }
  return {
    pnhSecurityPosture: {
      state: vt.state,
      highSeverityCount: vt.highSeverityCount,
      mediumSeverityFailCount: vt.mediumSeverityFailCount,
      scenariosTriggered: vt.scenariosTriggered,
      failureDetails: vt.failureDetails,
    },
    securityVerdict: pnhLast.securityVerdict ?? securityVerdictFromPnhStateJs(vt.state),
    pnhSecurityMessages: Array.isArray(vt.failureDetails)
      ? vt.failureDetails.map((f) => f.message).slice(0, 48)
      : [],
  };
}

let pnhSimInvoked = false;
const skipPnhSimulate = process.env.ALCHEMIST_SKIP_PNH_SIMULATE === "1";
if (mode === "verify-harsh" && finalExitCode === 0 && !skipPnhSimulate) {
  pnhSimInvoked = true;
  const withPnpm = join(root, "scripts", "with-pnpm.mjs");
  const simScript = join(root, "scripts", "pnh-simulate.ts");
  const simArgs = [withPnpm, "exec", "tsx", simScript, "--"];
  if (pnhCiStrict) simArgs.push("--ci");
  const sim = spawnSync(process.execPath, simArgs, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ALCHEMIST_PNPM_FALLBACK_QUIET: "1" },
    shell: false,
  });
  const simCode = sim.status === null ? 1 : sim.status;
  if (simCode !== 0) {
    finalExitCode = simCode;
    process.stderr.write(
      "[alchemist] PNH simulation failed — fix probes or refresh tools/pnh-simulation-baseline.json with pnpm pnh:simulate -- --write-baseline\n"
    );
  }
} else if (mode === "verify-harsh" && finalExitCode === 0 && skipPnhSimulate) {
  console.warn(
    "[verify:harsh] ALCHEMIST_SKIP_PNH_SIMULATE=1 — pnh:simulate skipped (sandbox env). PNH status will be absent from verify_post_summary."
  );
}

const durationMs = Date.now() - t0;

/** When the main pipeline passed but PNH `--ci` / simulation failed, surface an explicit step label. */
let summaryFailedStep = failedStep;
if (pnhSimInvoked && finalExitCode !== 0) {
  summaryFailedStep = summaryFailedStep ?? "pnh_simulate";
}

const iomSummaryMeta =
  iomVerifyMeta ??
  withIomCoverage(root, [], {
    iomSelectiveEngineMode: failedStep ? `${failedStep}_failed` : "no_engine_meta",
    iomSelectiveWarnings: failedStep
      ? [`Verify failed at step ${failedStep} before shared-engine Vitest meta was set.`]
      : [],
  });

const iomPulseMeta = collectIomVerifyMeta(root);
const wasmTruth = getWasmArtifactTruthForSummary(root);
const hardGateFiles = getHardGateFilesTruth(root);
const hardGateStrict = process.env.ALCHEMIST_STRICT_OFFSETS === "1";
const wasmAvailable = Boolean(wasmTruth.wasmBrowserFxpEncodeReady);

// Baseline "Engine Worth" signal (diagnostic only):
// - Test density from `docs/fire-metrics.json` (277 tests / 51 files → ~5.43 tests/file)
// - multiplied by current IOM coverage score from verify.
//
// No impact on gates/triad law — pure metadata for operators.
let engineWorth;
try {
  const fmPath = join(root, "docs", "fire-metrics.json");
  if (existsSync(fmPath)) {
    const fm = JSON.parse(readFileSync(fmPath, "utf8"));
    const vitestTestsPassed = fm?.vitestTestsPassed;
    const vitestTestFilesPassed = fm?.vitestTestFilesPassed;
    const testDensity =
      typeof vitestTestsPassed === "number" && typeof vitestTestFilesPassed === "number" && vitestTestFilesPassed > 0
        ? vitestTestsPassed / vitestTestFilesPassed
        : undefined;
    const iomCoverageScore = iomSummaryMeta?.iomCoverageScore;
    if (typeof testDensity === "number" && typeof iomCoverageScore === "number") {
      engineWorth = {
        score: testDensity * iomCoverageScore,
        testDensity,
        vitestTestsPassed,
        vitestTestFilesPassed,
        iomCoverageScore,
        unit: "tests/file × iomCoverage(0..1)",
        source: "docs/fire-metrics.json + iomCoverageScore from verify",
      };
    }
  }
} catch {
  engineWorth = undefined;
}

let aiomIntegrityScore;
let aiomIntegrityComponents;
let minimumOperatingNumber;
let minimumOperatingNumber117;
let minimumOperatingReady;

const releaseReadyFromSummary = Boolean(
  wasmAvailable &&
    hardGateFiles.hardGateSampleInitFxpPresent &&
    hardGateStrict &&
    wasmTruth.wasmArtifactTruth === "real",
);

const pnhVerifyContext = {
  verifyMode: pnhCiStrict
    ? "ci"
    : process.env.ALCHEMIST_SELECTIVE_VERIFY === "1"
      ? "selective"
      : "local",
  wasmReal: wasmTruth.wasmArtifactTruth === "real",
  iomSchismCodesCount: Array.isArray(iomPulseMeta?.iomSchismCodes)
    ? iomPulseMeta.iomSchismCodes.length
    : undefined,
  ciFailsOnPnhWarningTier: Boolean(
    pnhCiStrict && process.env.ALCHEMIST_PNH_ALLOW_WARNING !== "1",
  ),
  pnhAllowWarningEscapeHatch: process.env.ALCHEMIST_PNH_ALLOW_WARNING === "1" ? true : undefined,
  pnhCiStrictOptIn: pnhCiStrict ? true : undefined,
  note: "PNH verify slice — operator-supplied repeat counters are not persisted here; see triad telemetry pnhContextSurface on client runs.",
};

const pnhLast = readPnhSimulationLast(root);
const pnhRollup = buildPnhSecurityRollup({ mode, pnhSimInvoked, pnhLast });
const pnhStatusString =
  mode !== "verify-harsh"
    ? "n/a"
    : pnhSimInvoked
      ? (pnhLast?.pnhStatus ?? "unknown")
      : "skipped";

try {
  const iomCoverageScore =
    typeof iomSummaryMeta?.iomCoverageScore === "number" ? iomSummaryMeta.iomCoverageScore : null;
  const testsPassRatio = finalExitCode === 0 ? 1 : 0;
  const pnhImmunityRate =
    mode === "verify-harsh" &&
    typeof pnhLast?.totalScenarios === "number" &&
    pnhLast.totalScenarios > 0 &&
    typeof pnhLast?.breaches === "number"
      ? Math.max(0, Math.min(1, (pnhLast.totalScenarios - pnhLast.breaches) / pnhLast.totalScenarios))
      : null;
  if (iomCoverageScore !== null && pnhImmunityRate !== null) {
    const raw = (testsPassRatio * 0.4) + (iomCoverageScore * 0.35) + (pnhImmunityRate * 0.25);
    aiomIntegrityScore = Math.round(raw * 1000) / 1000;
    aiomIntegrityComponents = {
      testsPassRatio,
      iomCoverageScore,
      pnhImmunityRate,
      marketReadyThreshold: 0.98,
      marketReady: aiomIntegrityScore >= 0.98,
      formula: "(tests_passed_ratio * 0.4) + (iom_coverage * 0.35) + (pnh_immunity * 0.25)",
    };
    minimumOperatingNumber = aiomIntegrityScore;
    minimumOperatingNumber117 = Math.round(aiomIntegrityScore * 117);
    minimumOperatingReady = aiomIntegrityScore >= 0.9;
  }
} catch {
  aiomIntegrityScore = undefined;
  aiomIntegrityComponents = undefined;
  minimumOperatingNumber = undefined;
  minimumOperatingNumber117 = undefined;
  minimumOperatingReady = undefined;
}

const gitMeta = readGitMeta(root);
const triadPanelistModeExpected = buildTriadPanelistModeExpected();
const presetShareReadiness =
  existsSync(join(root, "apps", "web-app", "app", "api", "presets", "share", "route.ts")) &&
  existsSync(join(root, "apps", "web-app", "lib", "share-preset.ts"));
const verifyModeFlavor =
  process.env.ALCHEMIST_SELECTIVE_VERIFY === "1" && !process.env.CI ? "selective" : "full";
const paritySummary = {
  stubLiveDeltaCount:
    typeof pnhLast?.verifyTruth?.mediumSeverityFailCount === "number"
      ? pnhLast.verifyTruth.mediumSeverityFailCount
      : null,
  source:
    "pnh.verifyTruth.mediumSeverityFailCount (null when PNH simulation not current for this run)",
};

// Optional eval telemetry from unit tests.
// This is deterministic and safe: no raw prompt text is stored, only prompt hash + scalar summary.
let intentAlignmentStats;
try {
  const p = join(root, "artifacts", "verify", "intent-alignment-stats.json");
  if (existsSync(p)) {
    intentAlignmentStats = JSON.parse(readFileSync(p, "utf8"));
  }
} catch {
  intentAlignmentStats = undefined;
}

let pnhWarGameCompact;
try {
  const withPnpm = join(root, "scripts", "with-pnpm.mjs");
  const wgScript = join(root, "scripts", "pnh-wargame.ts");
  const wg = spawnSync(process.execPath, [withPnpm, "exec", "tsx", wgScript, "--"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ALCHEMIST_PNPM_FALLBACK_QUIET: "1", ALCHEMIST_WARGAME_RELEASE_MODE: "1" },
    shell: false,
  });
  if (wg.status === 0 && wg.stdout && wg.stdout.trim()) {
    const line = wg.stdout.trim().split("\n").filter(Boolean).pop();
    const report = JSON.parse(line);
    pnhWarGameCompact = {
      generatedAt: report.generatedAt,
      releaseShouldBeBlocked: report.releaseShouldBeBlocked,
      releaseBlockReasons: report.releaseBlockReasons,
      breachedSurfaces: report.breachedSurfaces,
      results: report.results.map((r) => ({
        scenarioId: r.scenarioId,
        classification: r.classification,
        releaseImpact: r.releaseImpact,
        whatFailed: r.whatFailed,
        verifyOutcome: r.verifyOutcome,
      })),
    };
  }
} catch {
  pnhWarGameCompact = undefined;
}

const verifySummaryBody = {
  mode,
  ...gitMeta,
  exitCode: finalExitCode,
  /** Always false — this script does not run harshcheck, assert:wasm, or assert:hard-gate unless you do separately. */
  productShippableFromVerifyScriptAlone: false,
  vstVerifyOptIn: process.env.ALCHEMIST_VST_VERIFY === "1" ? true : undefined,
  durationMs,
  failedStep: summaryFailedStep,
  monorepoRoot: root,
  verifyModeFlavor,
  triadPanelistModeExpected,
  ...wasmTruth,
  ...hardGateFiles,
  hardGate: hardGateStrict ? "enforced" : "best_effort",
  /** True when **`ALCHEMIST_STRICT_OFFSETS=1`** for this verify run (Python validation required if sample present). */
  hardGateStrict,
  wasmStatus: wasmAvailable ? "available" : "unavailable",
  /**
   * **`green_core`** — types + engine tests (+ optional PNH) from this script alone.
   * **`releaseReadyFromSummary`** — stricter: real WASM pkg, sample **`.fxp`**, strict HARD GATE env — not implied by **`exitCode: 0`** alone.
   */
  verifyLaneLabel: "green_core",
  releaseReadyFromSummary,
  presetShareReadiness,
  paritySummary,
  selectiveVerify:
    process.env.ALCHEMIST_SELECTIVE_VERIFY === "1" && !process.env.CI ? true : undefined,
  soeHint: soeHint(finalExitCode, durationMs, mode, iomSummaryMeta),
  note:
    "Auditable post-verify line — not a hidden brain; pipe stderr to your log store for SOE inputs.",
  ...iomSummaryMeta,
  ...iomPulseMeta,
  ...(typeof aiomIntegrityScore === "number" ? { aiomIntegrityScore } : {}),
  ...(aiomIntegrityComponents ? { aiomIntegrityComponents } : {}),
  ...(typeof minimumOperatingNumber === "number"
    ? {
        minimumOperatingNumber,
        minimumOperatingNumber117,
        minimumOperatingReady,
        minimumOperatingFormula:
          "MON=aiomIntegrityScore; MON117=round(MON*117); ready when MON>=0.9",
      }
    : {}),
  ...(engineWorth ? { engineWorth } : {}),
  ...(intentAlignmentStats
    ? {
        intentAlignmentAvg: intentAlignmentStats.meanIntentAlignmentScore,
        intentAlignmentSampleCount: intentAlignmentStats.sampleCount,
        intentAlignmentPromptHash: intentAlignmentStats.promptHash,
      }
    : {}),
  pnhVerifyContext,
  ...pnhRollup,
  pnhWarGame: pnhWarGameCompact,
  pnhStatus: pnhStatusString,
  triadConcurrencyPass: summaryFailedStep !== "triad:concurrency-stress" && finalExitCode === 0,
  pnhSimulation:
    pnhLast != null
      ? {
          totalScenarios: pnhLast.totalScenarios,
          breaches: pnhLast.breaches,
          regressions: pnhLast.regressions,
          severityBreakdown: pnhLast.severityBreakdown,
          ghostPassed: pnhLast.ghostPassed,
          warfareBreaches: pnhLast.warfareBreaches,
        }
      : undefined,
};

const verifyPostSummaryLine = {
  ts: new Date().toISOString(),
  event: "verify_post_summary",
  ...verifySummaryBody,
};
process.stderr.write(`${JSON.stringify(verifyPostSummaryLine)}\n`);

const verifyArtifactPaths = writeVerifyPostSummaryArtifacts(root, verifyPostSummaryLine);
process.stderr.write(
  `[alchemist] verify_post_summary JSON written: ${verifyArtifactPaths.verifyPostSummaryPath} (and verify-receipt-*)\n`,
);

if (process.env.ALCHEMIST_FIRE_SYNC === "1" && finalExitCode === 0) {
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

if (process.env.ALCHEMIST_BRAIN_SYNC === "1" && finalExitCode === 0) {
  const brainScript = join(root, "scripts", "sync-brain-fusion.mjs");
  const br = spawnSync(process.execPath, [brainScript], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env },
    shell: false,
  });
  const bc = br.status === null ? 1 : br.status;
  if (bc !== 0) {
    process.stderr.write(
      "[alchemist] ALCHEMIST_BRAIN_SYNC=1: sync-brain-fusion.mjs failed — brain-fusion-calibration.gen.ts not updated\n"
    );
  }
}

process.exit(finalExitCode);
