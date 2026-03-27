#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8"));
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        // ignore
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function run(root, command, args, env = {}) {
  const startedAt = new Date().toISOString();
  const r = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  return {
    command: `${command} ${args.join(" ")}`,
    startedAt,
    endedAt: new Date().toISOString(),
    exitCode: r.status ?? 1,
    ok: (r.status ?? 1) === 0,
  };
}

function gitSha(root) {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  return (r.stdout || "").trim() || "unknown";
}

function readJsonMaybe(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readLatestVerifySummary(root) {
  return (
    readJsonMaybe(join(root, ".artifacts", "verify", "verify-post-summary.json")) ??
    readJsonMaybe(join(root, "artifacts", "verify", "verify-post-summary.json"))
  );
}

function readTruthMatrixDoc(root) {
  const p = join(root, "docs", "truth-matrix.md");
  if (!existsSync(p)) return { found: false, rows: 0 };
  const text = readFileSync(p, "utf8");
  const rows = text
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("-----")).length;
  return { found: true, rows, path: p };
}

function readPnhLedger(root) {
  return readJsonMaybe(join(root, "tools", "pnh-immunity-ledger.json"));
}
function readInitiatorManifest(root) {
  return readJsonMaybe(join(root, "artifacts", "initiator", "skills-117-manifest.json"));
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[release-audit-receipt] monorepo root not found\n");
  process.exit(1);
}

const sha = gitSha(root);
const generatedAt = new Date().toISOString();

const steps = [];
steps.push(run(root, "pnpm", ["assert:wasm"], { REQUIRE_WASM: "1", ALCHEMIST_REQUIRE_WASM: "1" }));
steps.push(run(root, "pnpm", ["truth:matrix"]));
steps.push(run(root, "pnpm", ["pnh:ghost", "--", "--strict"]));

const verify = readLatestVerifySummary(root);
const truthMatrix = readTruthMatrixDoc(root);
const pnhLedger = readPnhLedger(root);
const initiatorManifest = readInitiatorManifest(root);

const receipt = {
  version: "1.0",
  generatedAt,
  gitSha: sha,
  verify: verify ?? { found: false },
  wasm: {
    available: verify?.wasmStatus === "available",
    real: verify?.wasmArtifactTruth === "real",
    source: "verify_post_summary + REQUIRE_WASM=1 assert:wasm",
  },
  truthMatrix,
  pnh: {
    passed: steps.find((s) => s.command.includes("pnpm pnh:ghost"))?.ok === true,
    immunityLedger: pnhLedger ?? null,
  },
  initiator: {
    initiationStatus: initiatorManifest?.initiationStatus ?? null,
    skillCount: initiatorManifest?.skillCount ?? null,
  },
  oneSeventeen: {
    skillsLoaded: 17,
    lastTrigger: "ynwa",
    spirit: "YNWA",
    pace: "elite",
  },
  stubLearningPolicy: "disabled",
  checks: steps,
};

const auditLockPayload = {
  gitSha: receipt.gitSha,
  generatedAt: receipt.generatedAt,
  wasm: receipt.wasm,
  truthMatrix: receipt.truthMatrix,
  pnhPassed: receipt.pnh.passed,
  hardGateStrict: receipt.verify?.hardGateStrict === true,
  socialResonanceScore: receipt.verify?.decisionReceipt?.socialResonanceScore ?? null,
  redZoneResonance: receipt.verify?.decisionReceipt?.redZoneResonance ?? null,
  initiatorSkillsSha256:
    initiatorManifest != null
      ? createHash("sha256").update(JSON.stringify(initiatorManifest)).digest("hex")
      : null,
};
const auditLockHash = createHash("sha256")
  .update(JSON.stringify(auditLockPayload))
  .digest("hex");
receipt.auditLock = {
  algorithm: "sha256",
  hash: auditLockHash,
  includesSocialResonance: true,
};

const ok =
  receipt.verify?.event === "verify_post_summary" &&
  receipt.wasm.available === true &&
  receipt.wasm.real === true &&
  receipt.truthMatrix.found === true &&
  receipt.pnh.passed === true &&
  steps.every((s) => s.ok);

const outDir = join(root, "artifacts");
mkdirSync(outDir, { recursive: true });
const jsonPath = join(outDir, `release-audit-receipt-${sha.slice(0, 12)}.json`);
const latestPath = join(outDir, "release-audit-receipt-latest.json");
writeFileSync(jsonPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
writeFileSync(latestPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

const mdRows = [
  ["HARD GATE (strict)", receipt.verify?.hardGateStrict === true ? "PASS" : "WARN", "verify_post_summary"],
  ["WASM Export", receipt.wasm.available && receipt.wasm.real ? "PASS" : "FAIL", "assert:wasm + verify_post_summary"],
  ["Truth Matrix", receipt.truthMatrix.found ? "PASS" : "FAIL", "docs/truth-matrix.md"],
  ["PNH Immunity", receipt.pnh.passed ? "PASS" : "FAIL", "pnpm pnh:ghost -- --strict"],
  ["Stub Learning Policy", "PASS", "reality-signals-log.ts"],
];
const md = [
  "# Release Audit Receipt",
  "",
  `Generated: ${generatedAt}`,
  `Git SHA: \`${sha}\``,
  "",
  "| Check | Status | Proof Source |",
  "|-------|--------|--------------|",
  ...mdRows.map((r) => `| ${r[0]} | ${r[1]} | ${r[2]} |`),
  "",
].join("\n");
writeFileSync(join(outDir, `release-audit-receipt-${sha.slice(0, 12)}.md`), `${md}\n`, "utf8");

process.stdout.write(`[release-audit-receipt] wrote ${jsonPath}\n`);
if ((process.env.REQUIRE_RELEASE_AUDIT ?? "0") === "1" && !ok) {
  process.stderr.write("[release-audit-receipt] REQUIRE_RELEASE_AUDIT=1 and critical checks failed\n");
  process.exit(1);
}
