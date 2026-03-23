/**
 * Agent Aji chat fusion — deterministic operator hints bridging SOE, health, and product stance.
 * Prefix `aji_fusion:` for grep; SOE numeric path keeps `soe_fusion:` via `mergeSoeWithAjiChat`.
 * No PII, no LLM, no CV/OSC claims in the web preset path (see alchemist-aji-fluidic).
 */
import { computeSoeRecommendations, type SoeRecommendations } from "./soe";

export interface AgentAjiChatFusion {
  fusionCodes: string[];
  fusionLines: string[];
}

const AJI_CHAT_BRIDGE =
  "aji_fusion: chat layer — NL contrast is exercised through Undercover/Slavic TS gates; CV/OSC Aji bridge stays research-only (alchemist-aji-fluidic), not web preset bytes";

/** Merge SOE fusion lines with a single cross-cutting Aji/chat stance line. */
export function mergeSoeWithAjiChat(soe: SoeRecommendations): AgentAjiChatFusion {
  return {
    fusionCodes: [...soe.fusionHintCodes, "AJI_CHAT_BRIDGE"],
    fusionLines: [...soe.fusionHintLines, AJI_CHAT_BRIDGE],
  };
}

/** Single-run snapshot → SOE + Aji bridge (client or server). */
export function computeAgentAjiChatFusionFromTriadTelemetry(t: {
  meanPanelistMs: number;
  triadFailureRate: number;
  gateDropRate: number;
  triadRunMode: "tablebase" | "fetcher" | "stub";
}): AgentAjiChatFusion {
  const triadStubRunFraction =
    t.triadRunMode === "stub" ? 1 : t.triadRunMode === "tablebase" ? 0 : undefined;
  const soe = computeSoeRecommendations({
    meanPanelistMs: t.meanPanelistMs,
    triadFailureRate: t.triadFailureRate,
    gateDropRate: t.gateDropRate,
    triadStubRunFraction,
  });
  return mergeSoeWithAjiChat(soe);
}

/** Roll-up for GET /api/health (keys + WASM liveness only). */
export function computeHealthAgentAjiChatFusion(input: {
  wasmOk: boolean;
  triadFullyLive: boolean;
  anyLive: boolean;
}): AgentAjiChatFusion {
  const rows: { code: string; line: string }[] = [];
  if (!input.wasmOk) {
    rows.push({
      code: "HEALTH_WASM",
      line:
        "aji_fusion: browser export off — build packages/fxp-encoder wasm; GET /api/health/wasm should be available before promising .fxp",
    });
  }
  if (!input.anyLive) {
    rows.push({
      code: "HEALTH_TRIAD_OFF",
      line:
        "aji_fusion: triad routes unconfigured — set provider keys; stub fetcher preserves gate identity but is not production sound",
    });
  } else if (!input.triadFullyLive) {
    rows.push({
      code: "HEALTH_TRIAD_PARTIAL",
      line:
        "aji_fusion: partial triad — Hermes velocity is API wall time only; complete 3/3 for full governance blend",
    });
  }
  if (rows.length === 0) {
    rows.push({
      code: "HEALTH_NOMINAL",
      line:
        "aji_fusion: health nominal — extra mile: verify:harsh after triad/export edits; parity stub===fetcher for gates",
    });
  }
  return {
    fusionCodes: rows.map((r) => r.code),
    fusionLines: rows.map((r) => r.line),
  };
}

/** Talent market scout attachment (no import of market-scout to avoid cycles). */
export function computeTalentAgentAjiChatFusion(input: {
  operatorReviewSuggested: boolean;
  gap: number;
  weakestPanelist: string | null;
  insufficientData: boolean;
}): AgentAjiChatFusion {
  if (input.insufficientData) {
    return {
      fusionCodes: ["TALENT_INSUFFICIENT_DATA"],
      fusionLines: [
        "aji_fusion: talent scout needs panelistHealth or triadHealthScore — benchmarks are operator-maintained; no auto model swap",
      ],
    };
  }
  const rows: { code: string; line: string }[] = [];
  if (input.operatorReviewSuggested) {
    rows.push({
      code: "TALENT_GAP",
      line: `aji_fusion: market gap flagged (Δ ${input.gap.toFixed(3)}) — review ${input.weakestPanelist ?? "aggregate"} routing manually; deployer-owned configuration`,
    });
  }
  if (rows.length === 0) {
    rows.push({
      code: "TALENT_NOMINAL",
      line:
        "aji_fusion: talent nominal — market rows are hints; triad weights stay canonical until product changes",
    });
  }
  return {
    fusionCodes: rows.map((r) => r.code),
    fusionLines: rows.map((r) => r.line),
  };
}

export function taxonomyPoolTooLargeAgentFusion(size: number, max: number): AgentAjiChatFusion {
  return {
    fusionCodes: ["TAXONOMY_POOL_BOUND"],
    fusionLines: [
      `aji_fusion: taxonomy pool ${size} > ${max} — narrow offline before Slavic path; keep pre-Slavic n bounded (scoreCandidates cost)`,
    ],
  };
}

/** Lines appended to arbitration_final logEvent (auditable, hints only). */
export const ARBITRATION_AGENT_AJI_FUSION_LINES = [
  "aji_fusion: transparent arbitration — 2-of-3 deterministic stages, full logEvent trail; no Slavic bypass",
] as const;

/** Expo shell until triad routes are wired. */
export function computeMobileShellAgentAjiChatFusion(): AgentAjiChatFusion {
  return {
    fusionCodes: ["MOBILE_SHELL"],
    fusionLines: [
      "aji_fusion: mobile shell — triad and WASM export live on web-app; this surface is operator stance until API parity ships",
    ],
  };
}
