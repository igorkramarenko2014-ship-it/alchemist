

/**
 * TRUST SIGNAL — mission-critical health snapshot.
 */
export interface TrustSignal {
  /** MON (Minimum Operating Number) [0,117]. */
  mon: {
    value: number;
    ready: boolean;
    source: string;
  };
  /** Freshness vs artifact storage logic. */
  freshnessStatus: "fresh" | "stale_data" | "unknown";
  /** Overall system readiness. */
  integrityStatus: "ok" | "degraded" | "source_unreachable";
  /** Count of active AIOM divergences. */
  divergences: number;
  /** Presence of PNH (Prompt-Network-Heuristics) breaches. */
  pnhImmunity: "clean" | "breach" ;
  /** WASM subsystem availability. */
  wasm: "available" | "unavailable";
  /** ISO-8601 timestamp of last check. */
  checkedAtUtc: string;
}

/**
 * WRAPPER REQUEST — The external business contract.
 * Must remain domain-agnostic (no music terminology).
 */
export interface WrapperRequest {
  /** Business domain (e.g. "finance", "healthcare", "admin"). */
  domain: string;
  /** Primary action intent. */
  intent: string;
  /** Opaque data payload relevant to the intent. */
  payload: Record<string, unknown>;
  /** Abstract trust score of the calling identity [0,1]. */
  callerTrustLevel: number;
  /** Force direct engine check skip cache. */
  requireFreshness: boolean;
  /** 
   * MANDATORY One-way lock for humanitarian applications. 
   * Once set, cannot be unset or broadened via Partial/Generic hacks.
   */
  readonly humanitarianGate: true | false;
}

/**
 * WRAPPER CONTEXT — Internal state derived during request lifecycle.
 */
export interface WrapperContext {
  requestId: string;
  startTimeMs: number;
  request: WrapperRequest;
  transmutationTrace?: any; // internal audit
}

/**
 * WRAPPER RESPONSE — The trust-bearing business result.
 */
export interface WrapperResponse {
  /** Outcome data structure. */
  result: any;
  /** Trust bearing verification signal. */
  trustSignal: TrustSignal;
  /** Qualitative confidence indicator. */
  confidence: "high" | "nominal" | "degraded";
  /** True when the caller should trigger local Plan B logic. */
  fallbackRequired: boolean;
  /** Human-readable explanation for degraded state. */
  note?: string;
}

/**
 * Strict Humanitarian Request variant.
 * Enforces `humanitarianGate: true` as a literal.
 */
export type HumanitarianWrapperRequest = Readonly<WrapperRequest & {
  readonly humanitarianGate: true;
}>;
