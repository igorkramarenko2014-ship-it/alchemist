/**
 * Agent Aji chat fusion — deterministic operator hints bridging SOE, health, and product stance.
 * **Canon:** strings and templates come from `docs/brain.md` §9a → `brain-fusion-calibration.gen.ts` (`pnpm brain:sync`).
 * Prefix `aji_fusion:` for grep; SOE numeric path keeps `soe_fusion:` via `mergeSoeWithAjiChat`.
 * No PII, no LLM, no CV/OSC claims in the web preset path (see alchemist-aji-fluidic).
 */
import {
  BRAIN_AJI_CHAT_BRIDGE,
  BRAIN_HEALTH_FUSION,
  BRAIN_MOBILE_SHELL_LINE,
  BRAIN_TALENT_INSUFFICIENT,
  BRAIN_TALENT_NOMINAL,
  formatBrainTalentGapFusionLine,
  formatBrainTaxonomyPoolBoundFusion,
} from "./brain-fusion-calibration.gen";
import { computeSoeRecommendations, type SoeRecommendations } from "./soe";

export interface AgentAjiChatFusion {
  fusionCodes: string[];
  fusionLines: string[];
}

export {
  BRAIN_ARBITRATION_AGENT_AJI_FUSION_LINES as ARBITRATION_AGENT_AJI_FUSION_LINES,
} from "./brain-fusion-calibration.gen";

/** Merge SOE fusion lines with a single cross-cutting Aji/chat stance line. */
export function mergeSoeWithAjiChat(soe: SoeRecommendations): AgentAjiChatFusion {
  return {
    fusionCodes: [...soe.fusionHintCodes, "AJI_CHAT_BRIDGE"],
    fusionLines: [...soe.fusionHintLines, BRAIN_AJI_CHAT_BRIDGE],
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
    rows.push({ code: "HEALTH_WASM", line: BRAIN_HEALTH_FUSION.HEALTH_WASM });
  }
  if (!input.anyLive) {
    rows.push({ code: "HEALTH_TRIAD_OFF", line: BRAIN_HEALTH_FUSION.HEALTH_TRIAD_OFF });
  } else if (!input.triadFullyLive) {
    rows.push({
      code: "HEALTH_TRIAD_PARTIAL",
      line: BRAIN_HEALTH_FUSION.HEALTH_TRIAD_PARTIAL,
    });
  }
  if (rows.length === 0) {
    rows.push({ code: "HEALTH_NOMINAL", line: BRAIN_HEALTH_FUSION.HEALTH_NOMINAL });
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
      fusionLines: [BRAIN_TALENT_INSUFFICIENT],
    };
  }
  const rows: { code: string; line: string }[] = [];
  if (input.operatorReviewSuggested) {
    rows.push({
      code: "TALENT_GAP",
      line: formatBrainTalentGapFusionLine(
        input.gap.toFixed(3),
        input.weakestPanelist ?? "aggregate"
      ),
    });
  }
  if (rows.length === 0) {
    rows.push({ code: "TALENT_NOMINAL", line: BRAIN_TALENT_NOMINAL });
  }
  return {
    fusionCodes: rows.map((r) => r.code),
    fusionLines: rows.map((r) => r.line),
  };
}

export function taxonomyPoolTooLargeAgentFusion(size: number, max: number): AgentAjiChatFusion {
  return {
    fusionCodes: ["TAXONOMY_POOL_BOUND"],
    fusionLines: [formatBrainTaxonomyPoolBoundFusion(size, max)],
  };
}

/** Expo shell until triad routes are wired. */
export function computeMobileShellAgentAjiChatFusion(): AgentAjiChatFusion {
  return {
    fusionCodes: ["MOBILE_SHELL"],
    fusionLines: [BRAIN_MOBILE_SHELL_LINE],
  };
}
