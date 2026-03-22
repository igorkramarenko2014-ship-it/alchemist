import { env } from "@/env";
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
  const anyLive = deepseekLive || qwenLive;
  const liveList = [
    deepseekLive ? "deepseek" : null,
    qwenLive ? "qwen" : null,
  ].filter(Boolean);
  return NextResponse.json({
    ok: true,
    wasm,
    triad: {
      panelistRoutes: anyLive ? "mixed" : "stub",
      livePanelists: liveList,
      note: anyLive
        ? `Live panelist HTTP: ${liveList.join(", ")} (fetcher). Llama remains stub until wired. Keys: DEEPSEEK_API_KEY, QWEN_API_KEY (DashScope). See docs/FIRESTARTER.md §5a.`
        : "POST /api/triad/* uses stubs until provider keys are set (DEEPSEEK_API_KEY, QWEN_API_KEY). Client runTriad still applies gates, scoring, and AI_TIMEOUT_MS when using makeTriadFetcher. See docs/FIRESTARTER.md §5a.",
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
    generatedAtMs: Date.now(),
    nodeEnv: process.env.NODE_ENV ?? "development",
  });
}
