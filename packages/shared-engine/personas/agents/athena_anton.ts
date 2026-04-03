import { computePersonaAdherence } from "../drift-harness";
import { recordPerspectiveSignal } from "../persona-influence";
import { extractPerspectiveSignal } from "../persona-iom-bridge";
import { PersonaAgent, PersonaAgentRunResult } from "../types";

/**
 * ATHENA ANTON — Sovereign Persona Node (Wrapper)
 * Identity: Anton (v1)
 * Role: Architect / Kinetic Layer
 * Pattern: Coordinator
 */
export const athenaAnton: PersonaAgent = {
  personaId: "anton_v1",

  run(input: string, output: string): PersonaAgentRunResult {
    // 1. Evaluate behavioral audit
    const adherence = computePersonaAdherence(input, output, this.personaId);

    // 2. Return coordinated result (signal is already recorded in computePersonaAdherence)
    return {
      output,
      diagnostics: {
        adherenceScore: adherence.score,
        status: adherence.status,
        violations: adherence.violations.map(v => v.ruleId),
        perspectiveSignal: adherence.perspectiveSignal
      }
    };
  }
};
