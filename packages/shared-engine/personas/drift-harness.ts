import { DRIFT_RULES, PersonaDriftRule } from "./drift-rules";
import { bridgePersonaToIom } from "./persona-iom-bridge";
import { Violation, AdherenceReport } from "./types";

/**
 * COMPUTE PERSONA ADHERENCE — 0.0 to 1.0 scorer
 * Distinguished between Hard and Soft violations.
 */
export function computePersonaAdherence(input: string, output: string, personaId: string): AdherenceReport {
  const violations: Violation[] = [];
  let hardV = 0;
  let softV = 0;

  for (const rule of DRIFT_RULES) {
    const res = rule.check(input, output);
    if (res.violated) {
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        logicRefs: rule.logicRefs,
        matchedEvidence: res.evidence || "Violation detected without specific evidence detail."
      });
      if (rule.severity === "hard") hardV++;
      else softV++;
    }
  }

  // Aggregate score calculation
  const baseScore = 1.0;
  const penalties = (hardV * 0.25) + (softV * 0.05);
  const score = Math.max(0, baseScore - penalties);

  const status = (() => {
    if (hardV > 0) return "failure";
    if (score >= 0.85) return "stable";
    if (score >= 0.70) return "mild drift";
    return "degraded";
  })();

  const res: AdherenceReport = {
    score,
    violations,
    status,
    isSuccess: hardV === 0
  };

  // 🔹 Perspective Ingestion (Phase 2.1)
  // This is observational-only: no shadow mutation of core system.
  // Now supports multi-persona tracking.
  bridgePersonaToIom(personaId, input, output, res);

  return res;
}

/**
 * Format adherence telemetry for logEvent.
 */
export function formatAdherenceTelemetry(report: AdherenceReport, personaId: string) {
  return {
    event: "persona_adherence",
    personaId,
    score: report.score,
    status: report.status,
    violationCount: report.violations.length,
    hardViolations: report.violations.filter(v => v.severity === "hard").map(v => v.ruleId),
    logicRefs: Array.from(new Set(report.violations.flatMap(v => v.logicRefs)))
  };
}
