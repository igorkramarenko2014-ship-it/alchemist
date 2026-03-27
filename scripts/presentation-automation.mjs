#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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

function readJsonMaybe(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function gitSha(root) {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  return (r.stdout || "").trim() || "unknown";
}

function buildIntegrationSnippet(baseUrl = "http://127.0.0.1:3000") {
  return [
    `const triad = await fetch("${baseUrl}/api/triad/deepseek", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });`,
    `const triadJson = await triad.json();`,
    `const truth = await fetch("${baseUrl}/api/health/truth", { headers: { "X-Ops-Token": process.env.ALCHEMIST_OPS_TOKEN ?? "" } });`,
    `const truthJson = await truth.json();`,
    `const receipt = JSON.parse(await fs.promises.readFile("artifacts/release-audit-receipt-latest.json", "utf8"));`,
  ].join("\n");
}

function toKeynoteSafe(s) {
  return s.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"").replaceAll("\n", "\\n");
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[presentation-automation] monorepo root not found\n");
  process.exit(1);
}

const verify =
  readJsonMaybe(join(root, "artifacts", "verify", "verify-post-summary.json")) ??
  readJsonMaybe(join(root, ".artifacts", "verify", "verify-post-summary.json"));
const pnh = readJsonMaybe(join(root, "tools", "pnh-simulation-last.json"));
const receipt = readJsonMaybe(join(root, "artifacts", "release-audit-receipt-latest.json"));
const demoStatusPath = join(root, "artifacts", "demo-status.md");
const demoStatus = existsSync(demoStatusPath) ? readFileSync(demoStatusPath, "utf8") : "";

const generatedAt = new Date().toISOString();
const sha = gitSha(root);
const integrationSnippet = buildIntegrationSnippet(process.env.ALCHEMIST_HEALTH_BASE_URL ?? "http://127.0.0.1:3000");

const evidence = {
  version: "1.0",
  generatedAt,
  gitSha: sha,
  verify: {
    testsPassed: verify?.engineWorth?.vitestTestsPassed ?? verify?.vitestTestsPassed ?? null,
    testFiles: verify?.engineWorth?.vitestTestFilesPassed ?? verify?.vitestTestFilesPassed ?? null,
    iomCoverageScore: verify?.iomCoverageScore ?? null,
    aiomIntegrityScore: verify?.aiomIntegrityScore ?? null,
    wasmStatus: verify?.wasmStatus ?? null,
    wasmArtifactTruth: verify?.wasmArtifactTruth ?? null,
    pnhStatus: verify?.pnhStatus ?? null,
  },
  pnh: {
    totalScenarios: pnh?.totalScenarios ?? null,
    breaches: pnh?.breaches ?? null,
    securityVerdict: pnh?.securityVerdict ?? null,
    verifyTruthState: pnh?.verifyTruth?.state ?? null,
  },
  receipt: {
    exists: receipt != null,
    generatedAt: receipt?.generatedAt ?? null,
    path: "artifacts/release-audit-receipt-latest.json",
  },
  integrationSnippet,
};

const outDir = join(root, "artifacts");
mkdirSync(outDir, { recursive: true });

const evidenceJsonPath = join(outDir, "presentation-evidence-pack.json");
writeFileSync(evidenceJsonPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

const evidenceMd = [
  "# AIOM Presentation Evidence Pack",
  "",
  `Generated: ${generatedAt}`,
  `Git SHA: \`${sha}\``,
  "",
  "## Executive Summary",
  `- Governance posture: ${verify?.verifyLaneLabel ?? "unknown"} (exitCode=${String(verify?.exitCode ?? "n/a")})`,
  `- AIOM integrity score: ${String(verify?.aiomIntegrityScore ?? "n/a")}`,
  `- WASM truth: ${String(verify?.wasmArtifactTruth ?? "n/a")} / ${String(verify?.wasmStatus ?? "n/a")}`,
  `- PNH posture: ${String(pnh?.securityVerdict ?? verify?.securityVerdict ?? "n/a")} (status=${String(verify?.pnhStatus ?? "n/a")})`,
  "",
  "## Metrics",
  "",
  "| Metric | Value | Source |",
  "|--------|-------|--------|",
  `| Tests passed | ${String(evidence.verify.testsPassed ?? "n/a")} | verify_post_summary |`,
  `| Test files | ${String(evidence.verify.testFiles ?? "n/a")} | verify_post_summary |`,
  `| IOM coverage | ${String(evidence.verify.iomCoverageScore ?? "n/a")} | verify_post_summary |`,
  `| AIOM integrity | ${String(evidence.verify.aiomIntegrityScore ?? "n/a")} | verify_post_summary |`,
  `| WASM export | ${String(evidence.verify.wasmStatus ?? "n/a")} (${String(evidence.verify.wasmArtifactTruth ?? "n/a")}) | verify_post_summary |`,
  `| PNH status | ${String(evidence.verify.pnhStatus ?? "n/a")} | verify_post_summary / pnh-simulation-last |`,
  "",
  "## 5-line Integration Snippet",
  "```ts",
  integrationSnippet,
  "```",
  "",
  "## Demo Status Snapshot",
  demoStatus.length > 0 ? demoStatus : "_demo-status.md missing_",
  "",
].join("\n");
writeFileSync(join(outDir, "presentation-evidence-pack.md"), `${evidenceMd}\n`, "utf8");

const pitchDeck = [
  "# AIOM — Governed Inference Infrastructure",
  "",
  "Most AI systems are black boxes. AIOM turns generation into bounded, auditable infrastructure.",
  "",
  "---",
  "# AI Healthy Environment",
  "",
  "- Deterministic TypeScript gatekeeping",
  "- No shadow governance",
  "- Explicit degraded-mode telemetry",
  "",
  "---",
  "# AIOM Control Plane",
  "",
  "- Triad orchestration + consensus behavior",
  "- Slavic/Undercover validation pipeline",
  "- Human-in-the-loop policy evolution",
  "",
  "---",
  "# Proof Layer",
  "",
  `- Tests: ${String(evidence.verify.testsPassed ?? "n/a")} across ${String(evidence.verify.testFiles ?? "n/a")} files`,
  `- AIOM integrity score: ${String(evidence.verify.aiomIntegrityScore ?? "n/a")}`,
  `- Release receipt: ${evidence.receipt.exists ? "available" : "missing"}`,
  "",
  "---",
  "# Resilience & Immunity",
  "",
  `- PNH total scenarios: ${String(evidence.pnh.totalScenarios ?? "n/a")}`,
  `- Breaches: ${String(evidence.pnh.breaches ?? "n/a")}`,
  `- Security verdict: ${String(evidence.pnh.securityVerdict ?? "n/a")}`,
  "",
  "---",
  "# Integration",
  "",
  "```ts",
  integrationSnippet,
  "```",
  "",
  "---",
  "# Close",
  "",
  "AIOM is infrastructure for controlled AI: orchestrated, validated, and machine-verifiable.",
  "",
].join("\n");
writeFileSync(join(outDir, "pitch-deck.md"), `${pitchDeck}\n`, "utf8");

const slides = [
  {
    title: "AIOM — Governed Inference Infrastructure",
    body: "Most AI systems are black boxes. AIOM turns generation into bounded, auditable infrastructure.",
  },
  {
    title: "AI Healthy Environment",
    body: "Deterministic TypeScript gatekeeping\\nNo shadow governance\\nExplicit degraded-mode telemetry",
  },
  {
    title: "AIOM Control Plane",
    body: "Triad orchestration + consensus\\nSlavic/Undercover validation\\nHuman-in-the-loop policy evolution",
  },
  {
    title: "Proof Layer",
    body: `Tests: ${String(evidence.verify.testsPassed ?? "n/a")} / ${String(evidence.verify.testFiles ?? "n/a")} files\\nAIOM integrity: ${String(evidence.verify.aiomIntegrityScore ?? "n/a")}\\nReceipt: ${evidence.receipt.exists ? "available" : "missing"}`,
  },
  {
    title: "Resilience & Immunity",
    body: `PNH scenarios: ${String(evidence.pnh.totalScenarios ?? "n/a")}\\nBreaches: ${String(evidence.pnh.breaches ?? "n/a")}\\nVerdict: ${String(evidence.pnh.securityVerdict ?? "n/a")}`,
  },
];
const jxaSlides = JSON.stringify(slides);
const jxaScript = `ObjC.import('stdlib');
const keynote = Application('Keynote');
keynote.activate();
const doc = keynote.Document().make();
const slides = ${jxaSlides};
for (let i = 0; i < slides.length; i++) {
  const data = slides[i];
  const s = i === 0 ? doc.slides[0] : keynote.Slide({}).make({ at: doc.slides.end });
  if (i > 0) {
    doc.slides.push(s);
  }
  try { s.defaultTitleItem().objectText().set(data.title); } catch (e) {}
  try { s.defaultBodyItem().objectText().set(data.body.replace(/\\\\n/g, '\\\\r')); } catch (e) {}
}`;
const keynoteScriptPath = join(outDir, "keynote-build.js");
writeFileSync(keynoteScriptPath, jxaScript, "utf8");

if (process.argv.includes("--apply-keynote")) {
  const probe = spawnSync("osascript", ["-l", "JavaScript", "-e", 'Application("com.apple.iWork.Keynote").name()'], {
    cwd: root,
    encoding: "utf8",
  });
  if ((probe.status ?? 1) !== 0) {
    process.stderr.write(
      '[presentation-automation] Keynote app probe failed. Trying to launch Keynote via "open -a Keynote"...\n'
    );
    const openApp = spawnSync("open", ["-a", "Keynote"], {
      cwd: root,
      encoding: "utf8",
    });
    if ((openApp.status ?? 1) !== 0) {
      process.stderr.write(
        '[presentation-automation] Keynote is not available in this session. Install/open Keynote and allow Automation permissions.\n'
      );
      process.stderr.write(
        '[presentation-automation] Try manually:\n' +
          '  mdfind "kMDItemCFBundleIdentifier == \\"com.apple.iWork.Keynote\\""\n' +
          '  osascript -l JavaScript -e \'Application("com.apple.iWork.Keynote").activate()\'\n'
      );
      process.exit(2);
    }
    // Give the app a brief moment to register automation dictionary.
    spawnSync("sleep", ["1"], { cwd: root, encoding: "utf8" });
  }
  const run = spawnSync("osascript", ["-l", "JavaScript", keynoteScriptPath], {
    cwd: root,
    stdio: "inherit",
  });
  if ((run.status ?? 1) !== 0) {
    process.stderr.write("[presentation-automation] Keynote apply failed\n");
    process.exit(run.status ?? 1);
  }
}

process.stdout.write(`[presentation-automation] wrote ${evidenceJsonPath}\n`);
process.stdout.write(`[presentation-automation] wrote ${join(outDir, "presentation-evidence-pack.md")}\n`);
process.stdout.write(`[presentation-automation] wrote ${join(outDir, "pitch-deck.md")}\n`);
process.stdout.write(`[presentation-automation] wrote ${keynoteScriptPath}\n`);
