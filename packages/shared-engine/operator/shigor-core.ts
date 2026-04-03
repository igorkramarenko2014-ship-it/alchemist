import {
  clamp01,
  OracleSignal,
  ShigorDecision,
  ShigorDecisionContext,
  TriadPersonaId,
} from "./operator-types";
import {
  computeMissionPressure,
  computeResonanceFragility,
  computeTruthAllowance,
} from "./operator-resonance";

/**
 * SHIGOR CORE — The Sovereign Center
 * 
 * Shigor does not generate identity from advisory layers. 
 * He remains the sovereign center that integrates them.
 * 
 * "Спокойная сила без намёка."
 */

function chooseLeadPersona(ctx: ShigorDecisionContext): TriadPersonaId {
  const { operatorState, oracleSignal, pulseCorrection } = ctx;

  // 1. Human / Consent Absolutes (Hard Return)
  if (operatorState.integrityFlags.humanPriorityOverride) {
    return "svitlana";
  }

  // 2. Execution / Operational Safety (Hard Return)
  if (!operatorState.integrityFlags.executionGateOpen) {
    return "svitlana";
  }

  // 3. Scoring / Bias Layer (Shaping)
  // Base scores: Bias everything towards the oracle/persisted lead first.
  const oracleLead = oracleSignal?.leadPersona ?? operatorState.governorState.leadPersona;
  const scores: Record<TriadPersonaId, number> = { svitlana: 0, anton: 0, elisey: 0 };
  scores[oracleLead] = 0.5;

  // 3a. Epistemic Brake (Dominant Bias)
  if (operatorState.integrityFlags.epistemicBrake) {
    scores.elisey += 0.8;
  }

  // 3b. Pulse Corrections (Bounded Bias)
  if (pulseCorrection?.hasPipelineFailure) {
    scores.svitlana += pulseCorrection.pipelineSeverity === "critical" ? 0.75 : 0.35;
  }
  if (pulseCorrection?.hasResonanceLoss) {
    scores.elisey += pulseCorrection.resonanceSeverity === "critical" ? 0.65 : 0.30;
  }
  if (pulseCorrection?.hasStabilityDrift) {
    // Stability drift slightly boosts calibration (Svitlana)
    scores.svitlana += pulseCorrection.stabilitySeverity === "critical" ? 0.4 : 0.2;
  }

  // 4. Final Selection
  if (scores.svitlana >= scores.anton && scores.svitlana >= scores.elisey && scores.svitlana > 0.4) {
    return "svitlana";
  }
  if (scores.elisey >= scores.anton && scores.elisey > 0.4) {
    return "elisey";
  }
  return "anton";
}

function computeDepthLevel(ctx: ShigorDecisionContext): number {
  const state = ctx.operatorState;
  const oracleDepth = ctx.oracleSignal?.depthLevel ?? 0.5;
  const allowance = computeTruthAllowance(state);
  const fragility = computeResonanceFragility(state);
  const preferredDepth = state.deliveryProfile.preferredDepth;

  // Depth respects oracle guidance (42%), resonance allowance (30%), 
  // and operator preference (18%), dampened by fragility (10%)
  return clamp01(
    oracleDepth * 0.42 +
    allowance * 0.30 +
    preferredDepth * 0.18 -
    fragility * 0.10
  );
}

function computeWarmth(ctx: ShigorDecisionContext): number {
  const state = ctx.operatorState;
  const fragility = computeResonanceFragility(state);
  const pulse = ctx.pulseCorrection;
  const preferredWarmth = state.deliveryProfile.preferredWarmth;

  // Pulse Stress increases the need for cushion
  const pulseWarmthBoost = pulse?.hasResonanceLoss || pulse?.hasStabilityDrift ? 0.25 : 0;

  if (ctx.oracleSignal?.warmth !== undefined) {
    const oracleWarmth = ctx.oracleSignal.warmth;
    // Bounded blending in presence of Oracle: 45% Oracle / 35% Preferred / 20% Fragility
    return clamp01(
      oracleWarmth * 0.45 +
      preferredWarmth * 0.35 +
      fragility * 0.20 +
      pulseWarmthBoost
    );
  }

  // Pure state blending: 70% Preference / 30% Fragility
  return clamp01(preferredWarmth * 0.70 + fragility * 0.30 + pulseWarmthBoost);
}

function computePacing(ctx: ShigorDecisionContext): number {
  const state = ctx.operatorState;
  const missionPressure = computeMissionPressure(state);
  const overload = state.resonanceState.overload;
  const pulse = ctx.pulseCorrection;

  // Pulse Stress significantly slows down pacing
  let pulsePacingBrake = 0;
  if (pulse?.hasPipelineFailure) pulsePacingBrake += 0.35;
  if (pulse?.hasStabilityDrift) pulsePacingBrake += 0.20;

  // Pacing driven by operator preference (55%) and mission pressure (35%)
  // dampened by operator overload and pulse stress
  return clamp01(
    state.deliveryProfile.pacingBias * 0.55 +
    missionPressure * 0.35 -
    overload * 0.20 -
    pulsePacingBrake,
  );
}

function shouldDeferTruth(ctx: ShigorDecisionContext, depthLevel: number): boolean {
  const state = ctx.operatorState;
  const pulse = ctx.pulseCorrection;

  // 1. Stop-gap: Consent Locked
  if (!state.integrityFlags.consentLocked) {
    return true;
  }

  // 2. Pulse Critical Guard (Self-Awareness)
  if (pulse?.hasPipelineFailure && pulse.pipelineSeverity === "critical") {
    return true;
  }
  if (pulse?.hasResonanceLoss && pulse.resonanceSeverity === "critical") {
    return true;
  }

  // 3. Advisor Signals
  if (ctx.oracleSignal?.deferTruth) {
    return true;
  }

  if (state.governorState.deferTruthActive) {
    return true;
  }

  // 4. Heuristic: Fragility vs Depth
  const fragility = computeResonanceFragility(state);
  const truthAllowance = computeTruthAllowance(state);

  // Defer if fragility is critical and depth exceeds current allowance
  return fragility > 0.72 && depthLevel > truthAllowance;
}

function shouldSilenceAfter(ctx: ShigorDecisionContext, depthLevel: number, warmth: number): boolean {
  const state = ctx.operatorState;
  const silenceBias = state.governorState.silenceAfterBias;
  const readinessMatch = ctx.oracleSignal?.readinessMatch ?? state.governorState.readinessMatch;
  const truthDensity = state.governorState.truthDensity;

  const score = clamp01(
    silenceBias * 0.35 +
    warmth * 0.15 +
    readinessMatch * 0.20 +
    truthDensity * 0.30,
  );

  // Only apply silence if score is high and operator tolerance allows
  return score >= 0.62 && state.resonanceState.silenceTolerance >= 0.45;
}

/**
 * Computes the final Shigor Core decision based on Operator Resonance and Oracle Signals.
 */
export function computeShigorDecision(ctx: ShigorDecisionContext): ShigorDecision {
  const pulse = ctx.pulseCorrection;
  const leadPersona = chooseLeadPersona(ctx);
  const depthLevel = computeDepthLevel(ctx);
  const warmth = computeWarmth(ctx);
  const pacing = computePacing(ctx);
  let deferTruth = shouldDeferTruth(ctx, depthLevel);
  const silenceAfter = !deferTruth && shouldSilenceAfter(ctx, depthLevel, warmth);
  const blockDestructiveActions = !!pulse?.hasIntegrityBreach;

  const rationaleCodes: string[] = [];

  // 1. Integrity Enforcement (Consent & Priority)
  if (!ctx.operatorState.integrityFlags.consentLocked) {
    deferTruth = true;
    rationaleCodes.push("CONSENT_LACKING");
  }
  if (ctx.operatorState.integrityFlags.humanPriorityOverride) {
    rationaleCodes.push("HUMAN_PRIORITY_OVERRIDE");
  }
  if (ctx.operatorState.integrityFlags.epistemicBrake) {
    rationaleCodes.push("EPISTEMIC_BRAKE");
  }

  // 2. Pulse Rationales
  if (pulse?.activeSafeMode) {
    rationaleCodes.push("AUTO_HEAL_SAFE_MODE");
    if (pulse.hasPipelineFailure) rationaleCodes.push("PIPELINE_STRESS_GUARD");
    if (pulse.hasResonanceLoss) rationaleCodes.push("RESONANCE_RECOVERY_MODE");
    if (pulse.hasStabilityDrift) rationaleCodes.push("STABILITY_REBALANCE");
    if (pulse.hasIntegrityBreach) rationaleCodes.push("INTEGRITY_PROTECT");
  }

  if (!ctx.operatorState.integrityFlags.executionGateOpen) {
    rationaleCodes.push("EXECUTION_GATE_CLOSED");
  }
  if (deferTruth && !rationaleCodes.includes("CONSENT_LACKING")) {
    rationaleCodes.push("DEFER_TRUTH");
  }
  if (silenceAfter) {
    rationaleCodes.push("SILENCE_AFTER");
  }

  return {
    leadPersona,
    depthLevel,
    pacing,
    warmth,
    deferTruth,
    silenceAfter,
    blockDestructiveActions,
    integrityFlags: ctx.operatorState.integrityFlags,
    rationaleCodes,
  };
}

export interface ShigorCore {
  profileId: "shigor_core_v1";
  operatorId: "ihor";
  computeDecision(ctx: ShigorDecisionContext): ShigorDecision;
}

export const shigorCore: ShigorCore = {
  profileId: "shigor_core_v1",
  operatorId: "ihor",
  computeDecision(ctx: ShigorDecisionContext): ShigorDecision {
    return computeShigorDecision(ctx);
  },
};
