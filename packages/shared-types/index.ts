/**
 * @alchemist/shared-types — single source of truth across web, mobile, VST bridge.
 * Parameter values and offset-derived fields are populated after serum-offset-map validation.
 * Normalised values: 0.0–1.0 unless units require otherwise.
 */

// ─── User mode (detected per prompt) ─────────────────────────────────────────
export type UserMode = "PRO" | "NEWBIE";

// ─── Serum preset state (skeleton; bodies filled post offset-map validation) ─
export interface SerumState {
  meta: SerumMeta;
  master: MasterState;
  oscA: OscillatorState;
  oscB: OscillatorState;
  noise: NoiseState;
  filter: FilterState;
  envelopes: EnvelopeState[];
  lfos: LFOState[];
  fx: EffectsRackState;
  matrix: ModulationMatrixRow[];
}

export interface SerumMeta {
  /** Placeholder until offset map. */
  _placeholder?: true;
}

export interface MasterState {
  /** Placeholder until offset map. */
  _placeholder?: true;
}

export interface OscillatorState {
  /** Placeholder until offset map. */
  _placeholder?: true;
}

export interface NoiseState {
  /** Placeholder until offset map. */
  _placeholder?: true;
}

export interface FilterState {
  /** Placeholder until offset map. */
  _placeholder?: true;
}

export interface EnvelopeState {
  /** Placeholder until offset map. */
  _placeholder?: true;
}

export interface LFOState {
  /** Placeholder until offset map. */
  _placeholder?: true;
}

export interface EffectsRackState {
  /** Placeholder until offset map. */
  _placeholder?: true;
}

export interface ModulationMatrixRow {
  /** Placeholder until offset map. */
  _placeholder?: true;
}

// ─── AI Triad panel output ───────────────────────────────────────────────────
/**
 * Wire IDs for routes + scoring. **Display / logs:** Alchemist codenames
 * (`HERMES` / `ATHENA` / `HESTIA`) via `PANELIST_ALCHEMIST_CODENAME` in shared-engine.
 */
export type Panelist = "LLAMA" | "DEEPSEEK" | "QWEN";

export interface AICandidate {
  state: SerumState;
  score: number;
  reasoning: string;
  panelist: Panelist;
  /** Optional user-facing line; Slavic legibility prefers this over `reasoning` when set. */
  description?: string;
  /** FxCk param array when available; used by Consensus Validator for physical-range checks. */
  paramArray?: number[];
  /**
   * Heuristic prompt→candidate alignment in **[0,1]** — keyword / category / param texture (**TS only**).
   * Set by **`scoreCandidates`** when a non-empty **`prompt`** is passed; omitted otherwise.
   */
  intentAlignmentScore?: number;
}

/** Per-panelist outcome for **`runTriad`** parity audits (fetcher + stub paths). */
export interface TriadPanelistRunOutcome {
  panelist: Panelist;
  candidateCount: number;
  failed: boolean;
  durationMs: number;
}

/**
 * Cross-mode parity class — comparable across stub / partial HTTP / full HTTP.
 * **`fully_live`** = fetcher path and all three panelists returned ≥1 candidate with no failure.
 */
export type TriadParityMode = "stub" | "fully_live" | "mixed" | "tablebase";

/** Single-run triad metrics attached to `AIAnalysis` for SOE / agent-aji chat fusion on the client. */
export interface TriadRunTelemetry {
  meanPanelistMs: number;
  triadFailureRate: number;
  gateDropRate: number;
  /** Satisfied without `unconfigured` — that case throws before a successful `AIAnalysis`. */
  triadRunMode: "tablebase" | "fetcher" | "stub";
  rawCandidateCount: number;
  afterGateCount: number;
  /** IOM / reviewer parity — how this run relates to ideal full triad. */
  triadParityMode: TriadParityMode;
  /** True when panel coverage is incomplete or any panelist failed (fetcher), or tablebase/stub policy flags it. */
  triadDegraded: boolean;
  /** Row order LLAMA → DEEPSEEK → QWEN; omitted for tablebase-only runs. */
  triadPanelOutcomes?: TriadPanelistRunOutcome[];
  /**
   * PNH runtime snapshot from **`evaluatePnhContext`** for this run (no session memory).
   * **`triadLaneClass`** is how the client run maps to stub / mixed / live for policy hints.
   */
  pnhContextSurface?: {
    triadLaneClass: "stub" | "mixed" | "fully_live" | "tablebase";
    riskLevel: "low" | "elevated" | "critical";
    environment: "safe" | "uncertain" | "hostile";
    fragilityScore01: number;
  };
  /**
   * PNH triad defense — prompt sanitization / response drops / scoring guard (hashes only; no raw prompt).
   */
  pnhTriadDefense?: {
    pnhIntervention: boolean;
    pnhInterventionTypes: string[];
    originalPromptHash: string;
    executionPromptHash: string;
  };
  /**
   * Fetcher path only: resolved after two panelists returned candidates that passed gates with scores
   * at or above **`triadEarlyResolveScoreFloor`** — third upstream call aborted for latency (observability;
   * parity may be **mixed**). Off unless explicitly enabled in **`runTriad`** options.
   */
  triadEarlyResolveTwo?: boolean;
  /** Default **0.9** when **`triadEarlyResolveTwo`** is used. */
  triadEarlyResolveScoreFloor?: number;
}

export interface AIAnalysis {
  candidates: AICandidate[];
  /** Human-readable summary of consensus validation (which candidates invalid, which offsets violated). */
  validationSummary?: string;
  /** Optional: wall-time + gate stats from this run for dashboards and `computeAgentAjiChatFusionFromTriadTelemetry`. */
  triadRunTelemetry?: TriadRunTelemetry;
  /**
   * After PNH prompt defense, the prompt string passed into triad gates / panel fetches.
   * Present only when it differs from the caller-supplied string (e.g. strip recover). Clients should
   * pass this to **`scoreCandidates`** so intent alignment matches execution.
   */
  triadExecutionPrompt?: string;
}

/**
 * Sidecar metadata for `.fxp` exports (`*.fxp.provenance.json`) — **not** embedded in FxCk bytes.
 * Browser exports cannot run **`validate-offsets.py`**; **`hardGateValidated`** stays false unless a future
 * pipeline merges CI attestation without inventing offsets.
 */
export interface FxpExportProvenanceV1 {
  schema: "alchemist.fxp_provenance";
  version: 1;
  timestamp: string;
  promptHash: string;
  triadMode: TriadParityMode | "unknown";
  triadFullyLive: boolean | null;
  gateSummary: string;
  wasmReal: boolean;
  hardGateValidated: boolean;
  encoderSurface: string;
  exportedProgramName: string;
  exportedCandidatePanelist: Panelist;
  triadRunMode?: "tablebase" | "fetcher" | "stub";
  lineage: { promptMatchesLastRun: boolean; exportRankIndex: number };
  exportTrustTier: "verified" | "unverified";
  hardGateRepoArtifactsPresent?: boolean | null;
  notes: string[];
}

export type { SharedPreset } from "./preset-share";
export {
  REALITY_TELEMETRY_EVENTS,
} from "./reality-signals";
export type {
  AlchemistExportAttemptedPayload,
  AlchemistExportSucceededPayload,
  AlchemistOutputDiscardedPayload,
  AlchemistOutputModifiedPayload,
  AlchemistOutputUsedPayload,
  RealityExploreMode,
  RealityGroundTruthAggregate,
  RealitySignalBase,
  RealitySignalPanelist,
  RealityTelemetryEventName,
} from "./reality-signals";
