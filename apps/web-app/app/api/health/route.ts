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

  return NextResponse.json({
    ok: true,
    wasm,
    triad: {
      panelistRoutes: "stub",
      note: "POST /api/triad/* returns stubPanelistCandidates until provider keys + real inference are wired (see docs/FIRESTARTER.md Implementation status). Client runTriad still applies gates, scoring, and AI_TIMEOUT_MS when using makeTriadFetcher.",
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
