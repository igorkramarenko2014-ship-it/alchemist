/**
 * TRIAD ARBITRATION WEIGHTS — Context-Driven Routing
 * 
 * Rules:
 * - Elisey leads on Novelty/Ambiguity (Mechanism Uncertainty).
 * - Svitlana leads on Emotional/Ethical ambiguity.
 * - Anton leads on Resource/Implementation density.
 * 
 * Logic: ELISEY = Epistemic Truth (Understanding Integrity)
 */

export interface PanelistContextWeights {
  ambiguity: number;
  novelty: number;
  emotionalHeat: number;
  ethicalRisk: number;
  implementationDensity: number;
  resourcePressure: number;
  operatorFatigue: number;
}

export const TRIAD_ARBITRATION_WEIGHTS: Record<string, PanelistContextWeights> = {
  svitlana_v1: {
    ambiguity: 0.4,
    novelty: 0.3,
    emotionalHeat: 0.9,
    ethicalRisk: 0.8,
    implementationDensity: 0.2,
    resourcePressure: 0.3,
    operatorFatigue: 0.9
  },
  anton_v1: {
    ambiguity: 0.3,
    novelty: 0.4,
    emotionalHeat: 0.1,
    ethicalRisk: 0.4,
    implementationDensity: 0.9,
    resourcePressure: 0.9,
    operatorFatigue: 0.2
  },
  elisey_v1: {
    ambiguity: 0.9,
    novelty: 1.0,
    emotionalHeat: 0.3,
    ethicalRisk: 0.6,
    implementationDensity: 0.3,
    resourcePressure: 0.4,
    operatorFatigue: 0.5
  }
};

/**
 * 🔒 ROUTING LAW (Elisey Override)
 * 
 * If: novelty > 0.7 && ambiguity > 0.6 && implementationDensity < 0.6
 * then: Elisey leads or assists by default.
 */
export function getLeadingPersonaId(context: Partial<PanelistContextWeights>): string {
  if (
    (context.novelty ?? 0) > 0.7 && 
    (context.ambiguity ?? 0) > 0.6 && 
    (context.implementationDensity ?? 0) < 0.6
  ) {
    return "elisey_v1";
  }

  // fallback to weighted scoring
  let maxScore = -1;
  let leader = "svitlana_v1";

  for (const [id, weights] of Object.entries(TRIAD_ARBITRATION_WEIGHTS)) {
    let currentScore = 0;
    for (const [key, val] of Object.entries(context)) {
      currentScore += (val ?? 0) * (weights[key as keyof PanelistContextWeights] ?? 0);
    }
    if (currentScore > maxScore) {
      maxScore = currentScore;
      leader = id;
    }
  }

  return leader;
}
