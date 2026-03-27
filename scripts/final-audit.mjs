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

function run(root, cmd, args, env = {}) {
  const startedAt = new Date().toISOString();
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  return {
    command: `${cmd} ${args.join(" ")}`,
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

async function fetchTruthMatrix(baseUrl) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/health/truth-matrix`;
  const startedAt = new Date().toISOString();
  try {
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json();
    const triadFullyLive = body?.triadFullyLive === true;
    const wasmStatus = body?.wasmStatus === "available";
    const hardGate = body?.hardGate === "enforced";
    return {
      command: `GET ${url}`,
      startedAt,
      endedAt: new Date().toISOString(),
      ok: res.ok && triadFullyLive && wasmStatus && hardGate,
      exitCode: res.ok ? 0 : 1,
      proof: { status: res.status, triadFullyLive, wasmStatus: body?.wasmStatus, hardGate: body?.hardGate },
    };
  } catch (e) {
    return {
      command: `GET ${url}`,
      startedAt,
      endedAt: new Date().toISOString(),
      ok: false,
      exitCode: 1,
      proof: { error: String(e) },
    };
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[final-audit] monorepo root not found\n");
  process.exit(1);
}

const steps = [];
steps.push(run(root, "pnpm", ["verify:ci"]));
steps.push(run(root, "pnpm", ["harshcheck:wasm"]));
steps.push(run(root, "pnpm", ["pnh:ghost", "--", "--strict"]));
steps.push(run(root, "pnpm", ["triad:parity-diff"]));
steps.push(run(root, "pnpm", ["health:audit"], { ALCHEMIST_RELEASE_AUDIT: "1" }));
steps.push(await fetchTruthMatrix(process.env.ALCHEMIST_HEALTH_BASE_URL ?? "http://127.0.0.1:3000"));

const ok = steps.every((s) => s.ok);
const sha = gitSha(root);
const generatedAt = new Date().toISOString();
const payload = {
  event: "alchemist_final_audit",
  generatedAt,
  gitSha: sha,
  ok,
  steps,
};
const signature = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
const receipt = { ...payload, signatureAlgorithm: "sha256", signature };

const outDir = join(root, "artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `audit-receipt-${sha.slice(0, 12)}.json`);
writeFileSync(outPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
process.stdout.write(`[final-audit] receipt: ${outPath}\n`);

if (!ok) {
  process.stderr.write("[final-audit] failed — at least one audit step failed\n");
  process.exit(1);
}
