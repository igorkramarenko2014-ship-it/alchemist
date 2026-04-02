import { DRIFT_RULES, PersonaDriftRule } from "./drift-rules";

export interface Violation {
  ruleId: string;
  severity: "hard" | "soft";
  logicRefs: string[];
  matchedEvidence: string;
}

export interface AdherenceReport {
  score: number;
  violations: Violation[];
  status: "stable" | "mild drift" | "degraded" | "failure";
  isSuccess: boolean;
}

/**
 * COMPUTE PERSONA ADHERENCE — 0.0 to 1.0 scorer
 * Distinguished between Hard and Soft violations.
 */
export function computePersonaAdherence(input: string, output: string): AdherenceReport {
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
  // Hard violations penalize significantly (0.2 per hardV)
  // Soft violations penalize less (0.05 per softV)
  const baseScore = 1.0;
  const penalties = (hardV * 0.25) + (softV * 0.05);
  const score = Math.max(0, baseScore - penalties);

  const status = (() => {
    if (hardV > 0) return "failure";
    if (score >= 0.85) return "stable";
    if (score >= 0.70) return "mild drift";
    return "degraded";
  })();

  return {
    score,
    violations,
    status,
    isSuccess: hardV === 0
  };
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
