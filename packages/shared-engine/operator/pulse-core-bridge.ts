import { IOMHealthPulseResult, IomSchismSeverity } from "../iom-pulse";
import { PulseCorrectionInput, PulseSeverity } from "./operator-types";

/**
 * Pulse-to-Core Bridge
 *
 * Maps complex diagnostic schisms from IOM Pulse into a simplified 
 * PulseCorrectionInput that the Shigor Core can use for self-correction.
 *
 * Architecture: Decoupled. Core does not know about specific pulse codes.
 */
export function derivePulseCorrectionInput(pulse: IOMHealthPulseResult): PulseCorrectionInput {
  const criticalCodes = pulse.schisms
    .filter((s) => s.severity === "critical")
    .map((s) => s.code);
  const warningCodes = pulse.schisms
    .filter((s) => s.severity === "warn")
    .map((s) => s.code);

  const hasPipelineFailure = pulse.schisms.some(
    (s) => s.code === "PIPELINE_SILENT_CHOKE" && s.severity === "critical"
  );
  const hasResonanceLoss = pulse.schisms.some(
    (s) => s.code === "CORE_RESONANCE_LOSS" && s.severity === "critical"
  );
  const hasIntegrityBreach = pulse.schisms.some(
    (s) => s.code === "integrity" && s.severity === "critical"
  );
  const hasStabilityDrift = pulse.schisms.some(
    (s) => s.code === "PERSONA_STABILITY_DRIFT" && (s.severity === "warn" || s.severity === "critical")
  );

  return {
    criticalCodes,
    warningCodes,
    hasIntegrityBreach,
    hasPipelineFailure,
    hasResonanceLoss,
    hasStabilityDrift,
    pipelineSeverity: getMaxSeverity(pulse.schisms.filter(s => s.code === "PIPELINE_SILENT_CHOKE")),
    resonanceSeverity: getMaxSeverity(pulse.schisms.filter(s => s.code === "CORE_RESONANCE_LOSS")),
    stabilitySeverity: getMaxSeverity(pulse.schisms.filter(s => s.code === "PERSONA_STABILITY_DRIFT")),
    integritySeverity: getMaxSeverity(pulse.schisms.filter(s => s.code === "integrity")),
    activeSafeMode: hasPipelineFailure || hasResonanceLoss || hasStabilityDrift || hasIntegrityBreach,
  };
}

function getMaxSeverity(schisms: { severity: IomSchismSeverity }[]): PulseSeverity {
  if (schisms.some((s) => s.severity === "critical")) return "critical";
  if (schisms.some((s) => s.severity === "warn")) return "warn";
  return "none";
}
