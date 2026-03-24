import { env } from "@/env";
import { listOpenTriadCircuitPanelists } from "@/lib/triad-circuit-breakers";
import { getOptionalSoeTriadSnapshotFromEnv } from "@/lib/soe-snapshot-from-env";
import {
  computeHealthAgentAjiChatFusion,
  getIgorOrchestratorManifest,
  getIOMHealthPulse,
} from "@alchemist/shared-engine";
import { NextResponse } from "next/server";

/**
 * Aggregates WASM + basic liveness (FIRE §2 `runHealthAggregate` subset).
 */
export async function GET(request: Request) {
  const wasmUrl = new URL("/api/health/wasm", request.url);
  let wasm: unknown = { ok: false, status: "unreachable" };
  try {
    const wasmRes = await fetch(wasmUrl, { cache: "no-store" });
    wasm = await wasmRes.json();
  } catch {
    wasm = { ok: false, status: "error" };
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
  ].filter(Boolean);
  const wasmRec =
    typeof wasm === "object" && wasm !== null ? (wasm as Record<string, unknown>) : null;
  const wasmOk =
    wasmRec?.ok === true &&
    wasmRec?.status === "available";
  const agentAjiChatFusion = computeHealthAgentAjiChatFusion({
    wasmOk,
    triadFullyLive: allLive,
    anyLive,
  });
  const soeSnapshot = getOptionalSoeTriadSnapshotFromEnv();
  return NextResponse.json({
    ok: true,
    wasm,
    triad: {
      panelistRoutes: anyLive ? "live" : "unconfigured",
      triadFullyLive: allLive,
      livePanelists: liveList,
      note: anyLive
        ? `Live panelist HTTP: ${liveList.join(", ")} (fetcher)${allLive ? " — full triad" : ""}. Keys: DEEPSEEK_API_KEY, QWEN_API_KEY (DashScope or OpenRouter URL), GROQ_API_KEY or LLAMA_API_KEY (Groq Llama). Optional LLAMA_GROQ_MODEL. See docs/FIRESTARTER.md §5a.`
        : "POST /api/triad/* returns 503 triad_unconfigured until keys are set (DEEPSEEK_API_KEY, QWEN_API_KEY, GROQ_API_KEY or LLAMA_API_KEY). Demo stubs: makeTriadFetcher(true). See docs/FIRESTARTER.md §5a.",
    },
    hardGate: {
      offsetMapPresent: true,
      pythonValidate: {
        script: "tools/validate-offsets.py",
        samplePath: "tools/sample_init.fxp",
        run: "pnpm validate:offsets  (ALCHEMIST_STRICT_OFFSETS=1 fails if sample missing)",
      },
    },
    telemetry: {
      logEvent: "stderr JSON lines (packages/shared-engine/telemetry.ts) — not dev-only console spam",
    },
    ops: {
      iomDashboardPath: "/api/health/iom",
      iomExtendedDashboardPath: "/api/iom/dashboard",
      iomPrometheusMetricsPath: "/api/metrics/iom",
      note: "Operator-only: set ALCHEMIST_OPS_TOKEN and X-Ops-Token — GET /api/health/iom (core), GET /api/iom/dashboard (+ snapshots), GET /api/metrics/iom (Prometheus text).",
    },
    igorOrchestrator: getIgorOrchestratorManifest(),
    iomPulse: getIOMHealthPulse({
      triad: {
        triadFullyLive: allLive,
        anyPanelistLive: anyLive,
        livePanelists: liveList as string[],
      },
      wasmOk: wasmOk,
      openTriadCircuitPanelists: listOpenTriadCircuitPanelists(),
      ...(soeSnapshot !== undefined && { soeSnapshot }),
    }),
    soeSnapshotInjected: soeSnapshot !== undefined,
    agentAjiChatFusion,
    generatedAtMs: Date.now(),
    nodeEnv: process.env.NODE_ENV ?? "development",
  });
}
