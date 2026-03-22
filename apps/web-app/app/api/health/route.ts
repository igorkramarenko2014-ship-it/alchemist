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
  return NextResponse.json({
    ok: true,
    wasm,
    triad: {
      panelistRoutes: deepseekLive ? "mixed" : "stub",
      note: deepseekLive
        ? "POST /api/triad/deepseek uses live DeepSeek when DEEPSEEK_API_KEY is set (x-alchemist-triad-mode: fetcher). Llama and Qwen routes remain stub until wired. See docs/FIRESTARTER.md §5a."
        : "POST /api/triad/* returns stubPanelistCandidates until provider keys are set (DeepSeek: DEEPSEEK_API_KEY). Client runTriad still applies gates, scoring, and AI_TIMEOUT_MS when using makeTriadFetcher. See docs/FIRESTARTER.md §5a.",
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
