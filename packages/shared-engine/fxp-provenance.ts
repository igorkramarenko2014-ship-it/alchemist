/**
 * Browser `.fxp` export provenance — sidecar JSON only; **no** FxCk mutation.
 */
import type { AICandidate, AIAnalysis, FxpExportProvenanceV1, TriadParityMode } from "@alchemist/shared-types";

export const ALCHEMIST_FXP_PROVENANCE_SCHEMA = "alchemist.fxp_provenance" as const;
export const ALCHEMIST_FXP_PROVENANCE_VERSION = 1 as const;

/** Stable encoder path string for auditors (matches `encoder.ts`). */
export const FXP_ENCODER_PROVENANCE_SURFACE =
  "@alchemist/shared-engine/encoder.ts → dynamic import @alchemist/fxp-encoder/wasm → encode_fxp_fxck";

/**
 * SHA-256 hex via **Web Crypto only** — safe for Next client bundles (no `node:crypto`).
 * Node 18+ and modern browsers expose `globalThis.crypto.subtle`.
 */
export async function sha256HexUtf8(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle?.digest) {
    throw new Error(
      "sha256HexUtf8: Web Crypto.subtle unavailable — use Node 18+ or a browser with crypto.subtle",
    );
  }
  const buf = await subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildFxpGateSummary(
  analysis: AIAnalysis | null,
  ranked: readonly AICandidate[],
  exportIndex: number
): string {
  const tel = analysis?.triadRunTelemetry;
  const parts: string[] = [];
  if (tel) {
    parts.push(
      `triadRun=${tel.triadRunMode}`,
      `parity=${tel.triadParityMode}`,
      `degraded=${tel.triadDegraded}`,
      `raw=${tel.rawCandidateCount}`,
      `afterTriadGates=${tel.afterGateCount}`,
      `gateDrop=${tel.gateDropRate.toFixed(3)}`,
      `failRate=${tel.triadFailureRate.toFixed(3)}`,
    );
  } else {
    parts.push("triadTelemetry=missing");
  }
  parts.push(`rankedCount=${ranked.length}`, `exportIndex=${exportIndex}`);
  const ex = ranked[exportIndex];
  if (ex) {
    parts.push(`export=${ex.panelist}:score=${ex.score.toFixed(4)}`);
  }
  const s = parts.join(" ");
  return s.length > 480 ? `${s.slice(0, 477)}…` : s;
}

type HealthTriadSlice = {
  triadFullyLive: boolean | null;
  hardGateRepoArtifactsPresent: boolean | null;
};

function parseHealthForProvenance(json: unknown): HealthTriadSlice {
  if (json === null || typeof json !== "object") {
    return { triadFullyLive: null, hardGateRepoArtifactsPresent: null };
  }
  const o = json as Record<string, unknown>;
  const tri = o.triad;
  let triadFullyLive: boolean | null = null;
  if (tri !== null && typeof tri === "object") {
    const tf = (tri as Record<string, unknown>).triadFullyLive;
    if (typeof tf === "boolean") triadFullyLive = tf;
  }
  const hg = o.hardGate;
  let hardGateRepoArtifactsPresent: boolean | null = null;
  if (hg !== null && typeof hg === "object") {
    const h = hg as Record<string, unknown>;
    const root = h.hardGateMonorepoRootResolved;
    const a = h.hardGateOffsetMapFilePresent;
    const b = h.hardGateValidateScriptPresent;
    const c = h.hardGateSampleInitFxpPresent;
    if (
      typeof root === "boolean" &&
      typeof a === "boolean" &&
      typeof b === "boolean" &&
      typeof c === "boolean"
    ) {
      hardGateRepoArtifactsPresent = root && a && b && c;
    }
  }
  return { triadFullyLive, hardGateRepoArtifactsPresent };
}

export type BuildFxpProvenanceContext = {
  prompt: string;
  analysis: AIAnalysis | null;
  rankedAfterScore: readonly AICandidate[];
  exportCandidate: AICandidate;
  exportRankIndex: number;
  programName: string;
  wasmReal: boolean;
  healthResponseJson: unknown | null;
  promptMatchesLastRun: boolean;
};

export async function buildFxpExportProvenanceV1(
  ctx: BuildFxpProvenanceContext
): Promise<FxpExportProvenanceV1> {
  const notes: string[] = [
    "FxCk bytes are unchanged; provenance lives in this sidecar only.",
    "hardGateValidated is false for browser export — run `pnpm assert:hard-gate` in CI or locally for Python byte validation.",
  ];
  const { triadFullyLive, hardGateRepoArtifactsPresent } = parseHealthForProvenance(
    ctx.healthResponseJson
  );
  if (ctx.healthResponseJson === null) {
    notes.push("GET /api/health failed or was skipped — triadFullyLive and repo HARD GATE file flags unknown.");
  } else if (triadFullyLive === null) {
    notes.push("Health JSON missing triad.triadFullyLive.");
  }
  if (hardGateRepoArtifactsPresent === false) {
    notes.push(
      "Server reports HARD GATE repo files incomplete (offset map / validate script / sample .fxp or monorepo root).",
    );
  }

  const tel = ctx.analysis?.triadRunTelemetry;
  const triadMode: TriadParityMode | "unknown" = tel?.triadParityMode ?? "unknown";
  const triadRunMode = tel?.triadRunMode;

  const gateSummary = buildFxpGateSummary(ctx.analysis, ctx.rankedAfterScore, ctx.exportRankIndex);

  const exportTrustTier: "verified" | "unverified" =
    ctx.wasmReal &&
    ctx.promptMatchesLastRun &&
    tel !== undefined &&
    ctx.healthResponseJson !== null &&
    triadFullyLive !== null
      ? "verified"
      : "unverified";

  if (exportTrustTier === "unverified") {
    notes.push(
      "exportTrustTier=unverified — WASM, lineage, triad telemetry, or health snapshot incomplete.",
    );
  }
  if (!ctx.promptMatchesLastRun) {
    notes.push("Prompt changed since last Generate — export lineage is stale.");
  }

  return {
    schema: ALCHEMIST_FXP_PROVENANCE_SCHEMA,
    version: ALCHEMIST_FXP_PROVENANCE_VERSION,
    timestamp: new Date().toISOString(),
    promptHash: await sha256HexUtf8(ctx.prompt),
    triadMode,
    triadFullyLive,
    gateSummary,
    wasmReal: ctx.wasmReal,
    hardGateValidated: false,
    encoderSurface: FXP_ENCODER_PROVENANCE_SURFACE,
    exportedProgramName: ctx.programName,
    exportedCandidatePanelist: ctx.exportCandidate.panelist,
    ...(triadRunMode !== undefined ? { triadRunMode } : {}),
    lineage: {
      promptMatchesLastRun: ctx.promptMatchesLastRun,
      exportRankIndex: ctx.exportRankIndex,
    },
    exportTrustTier,
    hardGateRepoArtifactsPresent,
    notes,
  };
}

export function fxpProvenanceSidecarFilename(fxpBasename: string): string {
  return `${fxpBasename}.provenance.json`;
}
