/**
 * @alchemist/shared-types — single source of truth across web, mobile, VST bridge.
 * Parameter values and offset-derived fields are populated after serum-offset-map validation.
 * Normalised values: 0.0–1.0 unless units require otherwise.
 */

// ─── User mode (detected per prompt) ─────────────────────────────────────────
export type UserMode = "PRO" | "NEWBIE";

export type CreativeStance =
  | "mirror"
  | "constraint"
  | "analogy"
  | "contrary"
  | "minimal"
  | "ritual"
  | "question"
  | "rhythm";

export interface CreativeConfig {
  enabled: boolean;
  stances: CreativeStance[];
  probability: number;
}

// ─── Transmutation outcome signals (MOVE 3) ──────────────────────────────────
export type TransmutationTaskType =
  | "bass"
  | "pluck"
  | "lead"
  | "pad"
  | "texture"
  | "fx"
  | "riser"
  | "noise"
  | "unknown";

export type TransmutationMood =
  | "dark"
  | "bright"
  | "warm"
  | "metallic"
  | "aggressive"
  | "soft"
  | "gritty"
  | "clean";

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
  /**
   * Social Probe Arbitration (SPA): deterministic creative-resonance score in [0,1].
   * Pure ranking signal from existing candidate/prompt data (no new model calls).
   */
  socialResonanceScore?: number;
  /** SPA v2: Amsterdam logic score in [0,1] (grooming penalty + inverse-aggression bonus). */
  redZoneResonanceScore?: number;
}

export interface TokenUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Per-panelist outcome for **`runTriad`** parity audits (fetcher + stub paths). */
export interface TriadPanelistRunOutcome {
  panelist: Panelist;
  candidateCount: number;
  failed: boolean;
  durationMs: number;
  /** Task 1: JSON auto-retry loop tracking (max 1 retry). */
  retryCount?: number;
  retryExhausted?: boolean;
  /** Tokens measured from this run. If missing/omitted, it's explicitly missing. */
  tokenUsage?: TokenUsageMetrics | null;
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
  /** Fetcher fast path: remaining panelist that was aborted after 2/3 high-confidence resolve. */
  triadLateJoinerPanelist?: Panelist;
  /** Explicit marker for fast-path observability (`triad_fast_path_resolved` on stderr telemetry). */
  triadFastPathResolved?: boolean;
  /**
   * Same as **`triad_run_end` / `triad_run_start` `runId`** for this client **`runTriad`** invocation — correlates
   * three **`POST /api/triad/*`** panelist calls with merged gate telemetry.
   */
  triadSessionId?: string;
  /** Power Logic Fusion: detect -> validate -> probe -> confirm classification. */
  plf?: {
    confidence: "low" | "medium" | "high";
    probe: "none" | "creative_stance" | "contrast_constraint";
    classification: "valid" | "noise";
  };
  probeIntelligence?: {
    signal: string;
    responseQuality: number;
    classification: "strong" | "weak" | "uncertain";
  };
  /**
   * **Transmutation Phase 2** — advisory ranking shifts.
   * - `status`: applied (valid profile used), fallback_baseline (error/missing), disabled.
   * - `effective`: the actual weights/deltas that reached the scoring engine after clamping.
   */
  transmutation?: {
    status: "applied" | "fallback_baseline" | "disabled";
    policyFamily?: string;
    confidence?: number;
    taskType?: string;
    effective: {
      triadWeights?: Record<string, number>;
      slavicThresholdDelta?: number;
      noveltyGateDelta?: number;
      tasteWeight?: number;
    };
    fallbackReason?: string;
    boundsTriggered?: string[];
  };
  /**
   * **MOVE 3** — Intent Alignment outcome metrics.
   * Strictly observational (Signal) feedback on result correctness.
   */
  outcomeAlignment?: {
    alignmentFinal: number;
    alignmentConfidence: number;
    breakdown: {
      taskType: number;
      mood: number;
      mixRole: number;
      novelty: number;
    };
    alignmentGainV1: number;
    survivorMeanAlignment: number;
  };
  oneSeventeen?: {
    skillsLoaded: number;
    initiationTriggered: boolean;
    lastTrigger: string | null;
    spirit: "YNWA";
    pace: "elite";
    strength?: "proven";
    honor?: "mom";
  };
  totalTokenUsage?: TokenUsageMetrics;
  tokenSavings?: {
    tokensUsed: number;
    tokensBaseline: number;
    tokensSaved: number;
    savingsPercent: number;
    baselineMode: "measured" | "estimated";
  };
}

export interface DecisionReceiptRejectionReason {
  candidateId: string;
  reason: string;
}

export interface DecisionReceipt {
  triadMode: string;
  selectedCandidateId: string | null;
  selectionReason: string[];
  rejectionReasons: DecisionReceiptRejectionReason[];
  /** Creative Signal Detection (SPA): top candidate resonance score [0,1]. */
  socialResonanceScore?: number;
  /** Amsterdam Signal Detection (Aggression/Grooming): top candidate resonance score [0,1]. */
  redZoneResonance?: number;
  oneSeventeen?: {
    skillsLoaded: number;
    lastTrigger: string | null;
    spirit: "YNWA";
    pace: "elite";
    strength?: "proven";
    honor?: "mom";
  };
  systemState: {
    wasmStatus: "available" | "unavailable" | "unknown";
    hardGateStatus: "enforced" | "unknown";
    stubUsage: boolean;
  };
}

export interface AIAnalysis {
  candidates: AICandidate[];
  /** Human-readable summary of consensus validation (which candidates invalid, which offsets violated). */
  validationSummary?: string;
  /** Optional: wall-time + gate stats from this run for dashboards and `computeAgentAjiChatFusionFromTriadTelemetry`. */
  triadRunTelemetry?: TriadRunTelemetry;
  /** Human-readable projection of existing run truth; no scoring/gate mutation. */
  decisionReceipt?: DecisionReceipt;
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
// ─── Cyclic Integrity / Core Model (Theory v1.0) ─────────────────────────────
export type DegradationLevel = "FULL" | "SAFE-14" | "SAFE-7" | "SAFE-4" | "ZERO";

export interface CoreModelState {
  level: DegradationLevel;
  /** Current state s in Z*29 (1-28). */
  state: number;
  /** 0-1 resonance score (1.0 for FULL, else 0.0). */
  resonance: number;
  /** True if |S| <= 7 (Miller-compliant). */
  humanReadable: boolean;
  /** Current output digit from 1/29 cycle. */
  digit: number;
}

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
