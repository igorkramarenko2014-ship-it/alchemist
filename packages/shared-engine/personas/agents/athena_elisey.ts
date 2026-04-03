import { computePersonaAdherence } from "../drift-harness";
import { PersonaAgent, PersonaAgentRunResult } from "../types";

/**
 * ATHENA ELISEY — Sovereign Persona Node (Wrapper)
 * Identity: Elisey (v1)
 * Role: Epistemic Challenger / Strategy Layer
 * Pattern: Coordinator
 */
export const athenaElisey: PersonaAgent = {
  personaId: "elisey_v1",

  run(input: string, output: string): PersonaAgentRunResult {
    // 1. Evaluate behavioral audit
    const adherence = computePersonaAdherence(input, output, this.personaId);

    // 2. Return coordinated result
    // Perspective ingestion is already handled by the drift harness.
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
