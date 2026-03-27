import { env } from "@/env";
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveMonorepoRoot(): string | null {
  const cwd = process.cwd();
  const candidates = [
    cwd,
    path.join(cwd, ".."),
    path.join(cwd, "..", ".."),
    path.join(cwd, "..", "..", ".."),
  ];
  for (const c of candidates) {
    const p = path.normalize(c);
    if (fs.existsSync(path.join(p, "apps")) && fs.existsSync(path.join(p, "packages"))) {
      return p;
    }
  }
  return null;
}

function readLatestReceipt(root: string | null): { sha: string; generatedAt: string } | null {
  if (!root) return null;
  const p = path.join(root, "artifacts", "release-audit-receipt-latest.json");
  if (!fs.existsSync(p)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
    return {
      sha: String(j.gitSha ?? "unknown"),
      generatedAt: String(j.generatedAt ?? "unknown"),
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!env.alchemistOpsToken) {
    return NextResponse.json(
      { ok: false, error: "truth_ops_disabled", note: "Set ALCHEMIST_OPS_TOKEN to enable this route." },
      { status: 503 }
    );
  }
  const token = request.headers.get("x-ops-token") ?? "";
  if (token !== env.alchemistOpsToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const healthRes = await fetch(new URL("/api/health", request.url), { cache: "no-store" });
  const health = (await healthRes.json()) as Record<string, unknown>;
  const wasmRes = await fetch(new URL("/api/health/wasm", request.url), { cache: "no-store" });
  const wasm = (await wasmRes.json()) as Record<string, unknown>;
  const tmRes = await fetch(new URL("/api/health/truth-matrix", request.url), { cache: "no-store" });
  const truthMatrix = (await tmRes.json()) as Record<string, unknown>;

  const triad = (health.triad as Record<string, unknown> | undefined) ?? {};
  const triadFullyLive = triad.triadFullyLive === true;
  const triadCoverage = String(triad.httpTriadCoverage ?? "none");
  const triadMode = !triadFullyLive
    ? triadCoverage === "none"
      ? "stub"
      : triadCoverage === "partial"
        ? "mixed"
        : "degraded"
    : "fully_live";

  const wasmTruth = String(wasm.wasmArtifactTruth ?? "unavailable");
  const wasmStatus =
    wasmTruth === "real"
      ? "real"
      : wasmTruth.includes("stub")
        ? "stub"
        : wasmTruth.includes("missing")
          ? "missing"
          : "unavailable";

  const hg = (health.hardGate as Record<string, unknown> | undefined) ?? {};
  const hardGate =
    process.env.ALCHEMIST_STRICT_OFFSETS === "1"
      ? "strict"
      : hg.hardGateOffsetMapFilePresent === true && hg.hardGateValidateScriptPresent === true
        ? "warn"
        : "missing";

  const advisoryCells = [
    { id: "soe", policy: "advisory_only" },
    { id: "pnh", policy: "advisory_only" },
    { id: "aji_entropy", policy: "advisory_only" },
  ];

  const latestReceipt = readLatestReceipt(resolveMonorepoRoot());
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    triadMode,
    wasmStatus,
    hardGate,
    advisoryCells,
    stubLearningPolicy: process.env.ALCHEMIST_ALLOW_STUB_LEARNING === "1" ? "enabled" : "disabled",
    latestReceipt,
    truthMatrixStatus: truthMatrix.runtimeChecks ?? null,
  });
}
