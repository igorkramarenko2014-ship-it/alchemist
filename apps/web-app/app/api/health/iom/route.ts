import { env } from "@/env";
import {
  analyzeTalentMarket,
  getDefaultMarketBenchmarks,
  getIgorOrchestratorManifest,
  getIOMHealthPulse,
} from "@alchemist/shared-engine";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Operator-only IOM / Igor dashboard. Requires **`ALCHEMIST_OPS_TOKEN`** and header **`X-Ops-Token`**.
 * Not linked in product UI — use for ops / monitoring only.
 */
export async function GET(request: Request) {
  if (!env.alchemistOpsToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "iom_ops_disabled",
        note: "Set ALCHEMIST_OPS_TOKEN to enable this route.",
      },
      { status: 503 },
    );
  }
  const token = request.headers.get("x-ops-token") ?? "";
  if (token !== env.alchemistOpsToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const wasmUrl = new URL("/api/health/wasm", request.url);
  let wasmOk = false;
  try {
    const wasmRes = await fetch(wasmUrl, { cache: "no-store" });
    const wasm = await wasmRes.json();
    const rec =
      typeof wasm === "object" && wasm !== null ? (wasm as Record<string, unknown>) : null;
    wasmOk = rec?.ok === true && rec?.status === "available";
  } catch {
    wasmOk = false;
  }

  const deepseekLive = env.deepseekApiKey.length > 0;
  const qwenLive = env.qwenApiKey.length > 0;
  const llamaLive = env.llamaApiKey.length > 0;
  const anyLive = deepseekLive || qwenLive || llamaLive;
  const allLive = deepseekLive && qwenLive && llamaLive;
  const liveList = [
    deepseekLive ? "deepseek" : null,
    qwenLive ? "qwen" : null,
    llamaLive ? "llama" : null,
  ].filter(Boolean) as string[];

  const iomPulse = getIOMHealthPulse({
    triad: {
      triadFullyLive: allLive,
      anyPanelistLive: anyLive,
      livePanelists: liveList,
    },
    wasmOk,
  });

  const talentInput = {
    triadHealthScore: iomPulse.soe?.triadHealthScore,
    benchmarks: getDefaultMarketBenchmarks(),
  };
  const talentMarket = analyzeTalentMarket(talentInput);

  return NextResponse.json({
    ok: true,
    generatedAtMs: Date.now(),
    igorOrchestrator: getIgorOrchestratorManifest(),
    iomPulse,
    recentAnomalies: iomPulse.schisms,
    operatorReviewSuggested: talentMarket.operatorReviewSuggested,
    talentMarketAnalysis: {
      reason: talentMarket.reason,
      gap: talentMarket.gap,
      weakestPanelist: talentMarket.weakestPanelist,
      weakestScore: talentMarket.weakestScore,
      topMarketTalentId: talentMarket.topMarketTalentId,
      agentAjiChatFusion: talentMarket.agentAjiChatFusion,
    },
    note:
      "Ops-only payload — diagnostic; no automatic routing changes. Talent hints require triadHealthScore in pulse (wire SOE snapshot on health route for richer signals).",
  });
}
