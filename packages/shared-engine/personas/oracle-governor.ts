import { PersonaInfluenceSnapshot } from "./persona-influence";
import { OracleSignal, TriadPersonaId } from "../operator/operator-types";
export { OracleSignal, TriadPersonaId };

/**
 * ORACLE SIGNAL — The Governor Layer
 * 
 * Pythia reduces ego-resistance to truth without mutating truth itself.
 * She governs delivery conditions, NOT truth content.
 * 
 * "Спокойная сила без намёка."
 */

/**
 * Orchestration Heuristic: Pythian Convergence.
 * Transforms panelist snapshots into a unified governor signal.
 */
export function getPythianSignal(snapshots: PersonaInfluenceSnapshot[]): OracleSignal {
  // Guard: Default if insufficient signal
  if (snapshots.length === 0) {
    return {
      leadPersona: "svitlana",
      depthLevel: 0.5,
      warmth: 0.8,
      readinessMatch: 0.5,
      truthDensity: 0,
      silenceAfter: false,
      deferTruth: false
    };
  }

  const findSnapshot = (id: string) => snapshots.find(s => s.personaId.includes(id));
  const svitlana = findSnapshot("svitlana");
  const anton = findSnapshot("anton");
  const elisey = findSnapshot("elisey");

  // 1. Calculate Warmth (Svitlana dominance)
  const warmth = svitlana ? svitlana.stabilityScore : 0.7;

  // 2. Calculate Depth (Elisey dominance)
  const depthLevel = elisey ? (1 - elisey.epistemicGapScore) : 0.5;
  const epistemicGap = elisey ? elisey.epistemicGapScore : 0.5;

  // 3. Truth Density (The User Refinement)
  // depth * gap = weighted complexity of the misunderstanding.
  const truthDensity = depthLevel * epistemicGap;

  // 4. Readiness Match (Aggregation of stability/entropy)
  const readinessMatch = snapshots.reduce((acc, s) => acc + s.stabilityScore, 0) / snapshots.length;

  // 5. Select Lead Persona
  let leadPersona: "svitlana" | "anton" | "elisey" = "svitlana";
  if (anton && anton.stabilityScore > 0.85 && depthLevel < 0.4) {
    leadPersona = "anton"; // Execution priority
  } else if (elisey && elisey.stabilityScore > 0.8 && depthLevel > 0.7) {
    leadPersona = "elisey"; // Epistemic priority
  }

  // 6. Formula of Silence (Heuristic)
  // Higher warmth + depth + readiness + density => Silence After (letting the truth land)
  const silenceThreshold = 0.62;
  const compositeSilenceScore = (warmth + depthLevel + readinessMatch + truthDensity) / 4;
  const silenceAfter = compositeSilenceScore > silenceThreshold;

  // 7. Defer Truth (Guardrail)
  // If readiness is critically low or density is extremely high relative to readiness.
  const deferTruth = readinessMatch < 0.3 && (depthLevel > 0.8 || truthDensity > 0.4);

  return {
    leadPersona,
    depthLevel,
    warmth,
    readinessMatch,
    truthDensity,
    silenceAfter,
    deferTruth
  };
}
