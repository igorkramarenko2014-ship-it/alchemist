/**
 * **Talent Profile** — formalises adversarial capability benchmarks (AIₐ).
 * **Signal-only:** influences testing intensity and observation/TBV strictness,
 * but NEVER mutates core system Law (gates, MON, integrityStatus).
 */

export interface SkillVector {
  backend: number;
  infra: number;
  exploit: number;
  aiSystems: number;
  reverseEngineering: number;
}

export type TalentTrustLevel = "external" | "known" | "internal";

export interface TalentProfile {
  id: string;
  displayName: string;
  skillVector: SkillVector;
  observedBehaviors: string[];
  trustLevel: TalentTrustLevel;
  lastEvaluatedAt: string;
}

/**
 * **Adversarial Envelope** — derived from the Capacity Ceiling (Top Talent).
 * Used to scale PNH scenario intensity and TBV advisory loops.
 */
export interface AdversarialEnvelope {
  /** 0-1 complexity of generated adversarial probes. */
  attackComplexity: number;
  /** Fuzzing depth/iteration multiplier for warfare sequences. */
  fuzzDepth: number;
  /** Variance level for adversarial prompt mutations. */
  promptVariance: number;
  /** Persistence level for timing/retry probes. */
  persistenceLevel: number;
}

/**
 * Audit telemetry for benchmark provenance.
 */
export interface BenchmarkProvenance {
  id: string;
  sourceType: "talent_profile" | "manual_override" | "market_row";
  compositeSkill: number;
  effectiveEnvelope: AdversarialEnvelope;
  signalOnly: boolean;
}
