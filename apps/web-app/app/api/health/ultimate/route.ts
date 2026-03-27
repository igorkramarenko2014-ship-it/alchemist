import { env } from "@/env";
import { buildTruthMatrixSnapshot, isUltimateAuditPass } from "@/lib/truth-matrix";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (env.alchemistOpsToken) {
    const token = request.headers.get("x-ops-token") ?? "";
    if (token !== env.alchemistOpsToken) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const wasmUrl = new URL("/api/health/wasm", request.url);
  let wasmAvailable = false;
  try {
    const wasmRes = await fetch(wasmUrl, { cache: "no-store" });
    const wasm = (await wasmRes.json()) as { status?: string; ok?: boolean; wasmArtifactTruth?: string };
    wasmAvailable =
      wasm?.ok === true &&
      wasm?.status === "available" &&
      wasm?.wasmArtifactTruth === "real";
  } catch {
    wasmAvailable = false;
  }

  const triadLivePanelists = [
    env.deepseekApiKey.length > 0 ? "deepseek" : null,
    env.qwenApiKey.length > 0 ? "qwen" : null,
    env.llamaApiKey.length > 0 ? "llama" : null,
  ].filter((v): v is string => v !== null);
  const triadFullyLive = triadLivePanelists.length === 3;

  const snapshot = buildTruthMatrixSnapshot({
    triadLivePanelists,
    triadFullyLive,
    wasmAvailable,
    strictOffsetsEnabled: process.env.ALCHEMIST_STRICT_OFFSETS === "1",
  });

  return NextResponse.json({
    ok: isUltimateAuditPass(snapshot),
    scope: "ultimate_audit",
    generatedAtMs: Date.now(),
    snapshot,
  });
}
