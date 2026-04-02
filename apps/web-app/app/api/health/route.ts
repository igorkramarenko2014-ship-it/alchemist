import { env } from "@/env";
import { listOpenTriadCircuitPanelists } from "@/lib/triad-circuit-breakers";
import { getOptionalSoeTriadSnapshotFromEnv } from "@/lib/soe-snapshot-from-env";
import { getVstHealthSnapshot } from "@/lib/vst-bundle-health";
import fs from "node:fs";
import path from "node:path";
import { getSystemHealthMetricFromArtifacts } from "@/lib/system-health-metric";
import {
  buildPnhHealthSnapshot,
  computeHealthAgentAjiChatFusion,
  getIgorOrchestratorManifest,
  getIOMHealthPulse,
  InfluenceStatus,
} from "@alchemist/shared-engine";
import { loadLearningIndex } from "@alchemist/shared-engine/node";
import { getTruthArtifact } from "@/lib/truth-matrix";
import { getGFUSCBurnState } from "@/lib/gfusc-burn-check";
import { NextResponse } from "next/server";

/** Same heuristic as `lib/vst-bundle-health.ts` — dev server cwd may be `apps/web-app`. */
function resolveMonorepoRootForHealth(): string | null {
  const cwd = process.cwd();
  const candidates = [
    cwd,
    path.join(cwd, ".."),
    path.join(cwd, "..", ".."),
    path.join(cwd, "..", "..", ".."),
  ];
  for (const c of candidates) {
    const norm = path.normalize(c);
    if (fs.existsSync(path.join(norm, "apps", "vst-wrapper", "CMakeLists.txt"))) {
      return norm;
    }
  }
  return null;
}

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
  const httpTriadCoverage = !anyLive ? "none" : allLive ? "full" : "partial";
  const triadParityWarnings: string[] = [];
  if (httpTriadCoverage === "none") {
    triadParityWarnings.push(
      "httpTriadCoverage=none: POST /api/triad/* returns 503 triad_unconfigured — local runTriad(makeTriadFetcher(true)) uses triadParityMode=stub; not comparable to live rankings or gate survival.",
    );
  } else if (httpTriadCoverage === "partial") {
    triadParityWarnings.push(
      "httpTriadCoverage=partial: only some panelist routes are live — runTriad(makeTriadFetcher(false)) typically yields triadParityMode=mixed unless all three succeed.",
    );
  }
  const wasmRec =
    typeof wasm === "object" && wasm !== null ? (wasm as Record<string, unknown>) : null;
  const wasmOk =
    wasmRec?.ok === true &&
    wasmRec?.status === "available" &&
    wasmRec?.wasmArtifactTruth === "real";
  const vstSnap = getVstHealthSnapshot();
  const vst = {
    ok: vstSnap.ok,
    available: vstSnap.ok,
    status: vstSnap.status,
    version: vstSnap.bundleBasename ?? "unavailable",
    /** Reserved for IOM / observer telemetry — not wired yet. */
    lastObservedMs: null as number | null,
    message: vstSnap.message,
    healthPath: "/api/health/vst",
  };
  const agentAjiChatFusion = computeHealthAgentAjiChatFusion({
    wasmOk,
    triadFullyLive: allLive,
    anyLive,
  });
  const soeSnapshot = getOptionalSoeTriadSnapshotFromEnv();

  const burnState = getGFUSCBurnState();
  const isBurned = burnState !== null;

  const repoRoot = resolveMonorepoRootForHealth();
  const offsetMapPath = repoRoot
    ? path.join(repoRoot, "packages", "fxp-encoder", "serum-offset-map.ts")
    : "";
  const validatePyPath = repoRoot ? path.join(repoRoot, "tools", "validate-offsets.py") : "";
  const sampleFxpPath = repoRoot ? path.join(repoRoot, "tools", "sample_init.fxp") : "";
  const hardGateOffsetMapFilePresent = repoRoot ? fs.existsSync(offsetMapPath) : false;
  const hardGateValidateScriptPresent = repoRoot ? fs.existsSync(validatePyPath) : false;
  const hardGateSampleInitFxpPresent = repoRoot ? fs.existsSync(sampleFxpPath) : false;

  const iomPulse = getIOMHealthPulse({
    triad: {
      triadFullyLive: allLive,
      anyPanelistLive: anyLive,
      livePanelists: liveList as string[],
    },
    wasmOk: wasmOk,
    openTriadCircuitPanelists: listOpenTriadCircuitPanelists(),
    ...(soeSnapshot !== undefined && { soeSnapshot }),
  });

  const pnhHealth = buildPnhHealthSnapshot({
    triadFullyLive: allLive,
    anyPanelistLive: anyLive,
    wasmOk,
    iomSchismCount: iomPulse.schisms.length,
    verifyMode: process.env.CI ? "ci" : "local",
  });

  const systemHealth =
    repoRoot != null ? getSystemHealthMetricFromArtifacts(repoRoot) : null;

  const learningIndex = loadLearningIndex();
  const truthArtifact = getTruthArtifact();

  const priorsStatus: InfluenceStatus["priorsStatus"] = {
    active: env.learningContextEnabled || env.corpusPriorEnabled || env.tastePriorEnabled,
    learningContext: env.learningContextEnabled,
    corpusPrior: env.corpusPriorEnabled,
    tastePrior: env.tastePriorEnabled,
    confidence: (learningIndex?.fitnessSnapshot?.learningOutcomes?.confidence as any) ?? "low",
    stalenessDays: (learningIndex?.fitnessSnapshot?.lessonFitness?.[0]?.stalenessDays as any) ?? null,
  };

  const learningStatus: InfluenceStatus["learningStatus"] = {
    status: learningIndex ? "active" : "inactive",
    confidence: (learningIndex?.fitnessSnapshot?.learningOutcomes?.confidence as any) ?? "low",
    sampleCount: learningIndex?.fitnessSnapshot?.learningOutcomes?.sampleCount ?? 0,
  };

  const ajiStatus: InfluenceStatus["ajiStatus"] = {
    active: (truthArtifact?.metrics as any)?.identityStatus?.ajiActive ?? false,
    expiresAtUtc: process.env.ALCHEMIST_AJI_EXPIRES_AT ?? null,
  };

  const influence: InfluenceStatus = {
    priorsStatus,
    learningStatus,
    ajiStatus,
    triadMode: {
      mode: httpTriadCoverage === "full" ? "fetcher" : httpTriadCoverage === "partial" ? "partial" : "stub",
    },
    personaStatus: iomPulse.personaInfluence ?? null,
  };

  return NextResponse.json({
    ok: !isBurned,
    wasm,
    vst,
    influence,
    live: {
      status: isBurned ? "down" : "operational",
      checks: {
        gfusc: isBurned ? "burned" : "clear",
        ...(isBurned ? { 
          burnedAtUtc: burnState.burnedAtUtc, 
          killswitchGeneration: burnState.killswitchGeneration,
          triggerDetails: burnState.triggerDetails
        } : {})
      }
    },
    triad: {
      panelists: {
        HERMES: {
          model: env.llamaGroqModel,
          baseUrl: env.llamaGroqBaseUrl,
          status: isBurned ? "down" : (llamaLive ? "configured" : "missing"),
        },
        ATHENA: {
          model: env.deepseekModel,
          baseUrl: env.deepseekBaseUrl,
          status: isBurned ? "down" : (deepseekLive ? "configured" : "missing"),
        },
        HESTIA: {
          model: env.qwenModel || (env.qwenBaseUrl.toLowerCase().includes("openrouter") ? "qwen/qwen2.5-7b-instruct" : "qwen-plus"),
          baseUrl: env.qwenBaseUrl,
          status: isBurned ? "down" : (qwenLive ? "configured" : "missing"),
        },
      },
      panelistRoutes: isBurned ? "down" : (anyLive ? "live" : "unconfigured"),
      triadFullyLive: isBurned ? false : allLive,
      livePanelists: isBurned ? [] : liveList,
      /**
       * Explicit coverage vs **`triadFullyLive`**: **`none`** = no keys; **`partial`** = 1–2 keys;
       * **`full`** = all three. Client stubs can still run when **`none`** — see **`note`**.
       */
      httpTriadCoverage: isBurned ? "none" : httpTriadCoverage,
      /** True when this server's `/api/triad/*` can call live providers (env keys). */
      httpTriadProviderConfigured: isBurned ? false : anyLive,
      /**
       * Client `runTriad` in the browser may still use **local stub fetchers** for demos when
       * keys are missing — that path is not this server's POST behavior. Audit network + 503.
       */
      httpTriadPostWhenUnconfigured: isBurned ? "POST /api/triad/* → 410 gfusc_burn_active" : "POST /api/triad/* → 503 triad_unconfigured (no upstream inference)",
      note: isBurned
        ? "Engine burned (GFUSC killswitch) — all ingress denied."
        : (anyLive
          ? `Live panelist HTTP: ${liveList.join(", ")} (fetcher)${allLive ? " — full triad" : ""}. Keys: DEEPSEEK_API_KEY, QWEN_API_KEY (DashScope or OpenRouter URL), GROQ_API_KEY or LLAMA_API_KEY (Groq Llama). Optional LLAMA_GROQ_MODEL. See docs/FIRESTARTER.md §5a.`
          : "POST /api/triad/* returns 503 triad_unconfigured until keys are set (DEEPSEEK_API_KEY, QWEN_API_KEY, GROQ_API_KEY or LLAMA_API_KEY). Demo stubs: makeTriadFetcher(true). See docs/FIRESTARTER.md §5a."),
      /** Parity / reviewer hints — empty when httpTriadCoverage is full. */
      triadParityWarnings,
    },
    hardGate: {
      /** Filesystem only — same paths as **`pnpm assert:hard-gate`**. Not Python validation. */
      hardGateMonorepoRootResolved: repoRoot !== null,
      hardGateOffsetMapFilePresent,
      hardGateValidateScriptPresent,
      hardGateSampleInitFxpPresent,
      /** @deprecated Use **`hardGateOffsetMapFilePresent`** (was always true before — misleading). */
      offsetMapPresent: hardGateOffsetMapFilePresent,
      pythonValidate: {
        script: "tools/validate-offsets.py",
        samplePath: "tools/sample_init.fxp",
        run: "pnpm assert:hard-gate  or  pnpm validate:offsets  (ALCHEMIST_STRICT_OFFSETS=1 fails if sample missing)",
      },
      /** This endpoint never runs **`validate-offsets.py`** — run CI / local assert for byte truth. */
      hardGatePythonValidatedAtRuntime: false,
    },
    telemetry: {
      logEvent: "stderr JSON lines (packages/shared-engine/telemetry.ts) — not dev-only console spam",
    },
    ops: {
      iomDashboardPath: "/api/health/iom",
      truthMatrixPath: "/api/health/truth-matrix",
      truthOpsPath: "/api/health/truth",
      ultimateAuditPath: "/api/health/ultimate",
      iomExtendedDashboardPath: "/api/iom/dashboard",
      iomPrometheusMetricsPath: "/api/metrics/iom",
      note: "Operator-only: set ALCHEMIST_OPS_TOKEN and X-Ops-Token — GET /api/health/iom (core), GET /api/iom/dashboard (+ snapshots), GET /api/metrics/iom (Prometheus text).",
    },
    igorOrchestrator: getIgorOrchestratorManifest(),
    pnh: {
      riskLevel: isBurned ? "critical" : pnhHealth.evaluation.riskLevel,
      environment: pnhHealth.evaluation.environment,
      fragilityScore01: isBurned ? 1.0 : pnhHealth.fragilityScore01,
      triadParityModeHint: isBurned ? "burned" : pnhHealth.input.triadParityMode,
      iomSchismCount: iomPulse.schisms.length,
      note: "PNH context snapshot from aggregate health signals — same model as shared-engine evaluatePnhContext.",
    },
    iomPulse,
    systemHealth,
    soeSnapshotInjected: soeSnapshot !== undefined,
    agentAjiChatFusion,
    generatedAtMs: Date.now(),
    nodeEnv: process.env.NODE_ENV ?? "development",
  });
}
