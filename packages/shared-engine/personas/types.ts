import { PersonaPerspectiveSignal } from "./persona-influence";

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
  perspectiveSignal?: PersonaPerspectiveSignal;
}

export interface PersonaAgentRunResult {
  output: string;
  diagnostics: {
    adherenceScore: number;
    status: AdherenceReport["status"];
    violations: string[];
    perspectiveSignal?: PersonaPerspectiveSignal;
  };
}

export interface PersonaAgent {
  personaId: string;
  run(input: string, output: string): PersonaAgentRunResult;
}
