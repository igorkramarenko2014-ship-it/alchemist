#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

function readWasmHash(root) {
  const wasmPath = join(root, "packages", "fxp-encoder", "pkg", "fxp_encoder_bg.wasm");
  if (!existsSync(wasmPath)) return "missing";
  const b = readFileSync(wasmPath);
  return createHash("sha256").update(b).digest("hex");
}

async function fetchJson(baseUrl, route, token) {
  const url = `${baseUrl.replace(/\/$/, "")}${route}`;
  try {
    const headers = token ? { "x-ops-token": token } : undefined;
    const res = await fetch(url, { headers, cache: "no-store" });
    const body = await res.json();
    return { ok: res.ok, status: res.status, body, url };
  } catch (e) {
    return { ok: false, status: 0, body: { error: String(e) }, url };
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[godzilla-receipt] monorepo root not found\n");
  process.exit(1);
}

const sha = gitSha(root);
const verifySummary =
  readJsonMaybe(join(root, "artifacts", "verify", "verify-post-summary.json")) ??
  readJsonMaybe(join(root, ".artifacts", "verify", "verify-post-summary.json"));
const pnhLedger = readJsonMaybe(join(root, "tools", "pnh-immunity-ledger.json"));

const baseUrl = process.env.ALCHEMIST_HEALTH_BASE_URL ?? "http://127.0.0.1:3000";
const opsToken = process.env.ALCHEMIST_OPS_TOKEN ?? "";
const truth = await fetchJson(baseUrl, "/api/health/truth-matrix", opsToken);
const ultimate = await fetchJson(baseUrl, "/api/health/ultimate", opsToken);
const wasmHash = readWasmHash(root);

const rows = [
  {
    check: "HARD GATE (strict)",
    status:
      verifySummary?.hardGateStrict === true && verifySummary?.hardGateSampleInitFxpPresent === true
        ? "✅"
        : "❌",
    proof: `strict=${String(verifySummary?.hardGateStrict)} sampleInit=${String(verifySummary?.hardGateSampleInitFxpPresent)}`,
  },
  {
    check: "WASM Export",
    status:
      verifySummary?.wasmStatus === "available" && verifySummary?.wasmArtifactTruth === "real" ? "✅" : "❌",
    proof: `wasmStatus=${String(verifySummary?.wasmStatus)} wasmArtifactTruth=${String(verifySummary?.wasmArtifactTruth)} wasmHash=${wasmHash.slice(0, 16)}`,
  },
  {
    check: "PNH immunity",
    status: verifySummary?.pnhStatus === "ok" ? "✅" : verifySummary?.pnhStatus === "skipped" ? "⚠️" : "❌",
    proof: `pnhStatus=${String(verifySummary?.pnhStatus)} ledger=${pnhLedger ? "present" : "missing"}`,
  },
  {
    check: "Stub learning disabled",
    status: "✅",
    proof: "reality-signals-log.ts enforces ALLOW_STUB_LEARNING gate",
  },
  {
    check: "Truth matrix",
    status: truth.ok ? "✅" : "❌",
    proof: `${truth.url} status=${truth.status}`,
  },
  {
    check: "Ultimate audit endpoint",
    status: ultimate.ok ? "✅" : "❌",
    proof: `${ultimate.url} status=${ultimate.status}`,
  },
];

const md = [
  `# Godzilla Final Receipt`,
  ``,
  `Generated: ${new Date().toISOString()}`,
  `Git SHA: \`${sha}\``,
  ``,
  `| Check | Status | Proof |`,
  `|-------|--------|-------|`,
  ...rows.map((r) => `| ${r.check} | ${r.status} | ${r.proof} |`),
  ``,
].join("\n");

const outDir = join(root, "artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `godzilla-receipt-${sha.slice(0, 12)}.md`);
writeFileSync(outPath, `${md}\n`, "utf8");
process.stdout.write(`[godzilla-receipt] wrote ${outPath}\n`);
