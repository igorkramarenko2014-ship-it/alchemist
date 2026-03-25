/**
 * Aggregate PNH context for **`GET /api/health`** and verify summaries (no request body).
 */
import type { TriadParityMode } from "@alchemist/shared-types";
import { evaluatePnhContext, pnhContextFragilityScore } from "./pnh-context-evaluator";
import type {
  PnhContextEvaluation,
  PnhContextInput,
  PnhVerifyMode,
} from "./pnh-context-types";

export function buildPnhHealthContextInput(args: {
  triadFullyLive: boolean;
  anyPanelistLive: boolean;
  wasmOk: boolean;
  iomSchismCount?: number;
  verifyMode?: PnhVerifyMode;
  taxonomySize?: number;
  pnhRepeatTriggersSession?: number;
}): PnhContextInput {
  let triadParityMode: TriadParityMode | "unknown" = "unknown";
  if (!args.anyPanelistLive) triadParityMode = "stub";
  else if (args.triadFullyLive) triadParityMode = "fully_live";
  else triadParityMode = "mixed";

  return {
    triadParityMode,
    triadFullyLive: args.triadFullyLive,
    wasmReal: args.wasmOk,
    ...(args.iomSchismCount !== undefined && { iomSchismCount: args.iomSchismCount }),
    ...(args.verifyMode !== undefined && { verifyMode: args.verifyMode }),
    ...(args.taxonomySize !== undefined && { taxonomySize: args.taxonomySize }),
    ...(args.pnhRepeatTriggersSession !== undefined && {
      pnhRepeatTriggersSession: args.pnhRepeatTriggersSession,
    }),
  };
}

export function buildPnhHealthSnapshot(args: {
  triadFullyLive: boolean;
  anyPanelistLive: boolean;
  wasmOk: boolean;
  iomSchismCount?: number;
  verifyMode?: PnhVerifyMode;
  taxonomySize?: number;
  pnhRepeatTriggersSession?: number;
}): {
  input: PnhContextInput;
  evaluation: PnhContextEvaluation;
  fragilityScore01: number;
} {
  const input = buildPnhHealthContextInput(args);
  return {
    input,
    evaluation: evaluatePnhContext(input),
    fragilityScore01: pnhContextFragilityScore(input),
  };
}
