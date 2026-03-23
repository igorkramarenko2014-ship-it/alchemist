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
}

/** Single-run triad metrics attached to `AIAnalysis` for SOE / agent-aji chat fusion on the client. */
export interface TriadRunTelemetry {
  meanPanelistMs: number;
  triadFailureRate: number;
  gateDropRate: number;
  /** Satisfied without `unconfigured` — that case throws before a successful `AIAnalysis`. */
  triadRunMode: "tablebase" | "fetcher" | "stub";
  rawCandidateCount: number;
  afterGateCount: number;
}

export interface AIAnalysis {
  candidates: AICandidate[];
  /** Human-readable summary of consensus validation (which candidates invalid, which offsets violated). */
  validationSummary?: string;
  /** Optional: wall-time + gate stats from this run for dashboards and `computeAgentAjiChatFusionFromTriadTelemetry`. */
  triadRunTelemetry?: TriadRunTelemetry;
}
