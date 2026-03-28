import { env } from "@/env";
import { buildTruthMatrixSnapshot } from "@/lib/truth-matrix";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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

  const { artifact, canonicalMetrics, live, ...snapshotRest } = snapshot;
  return NextResponse.json({
    artifact: artifact ?? null,
    canonicalMetrics,
    live,
    ...snapshotRest,
  });
}

