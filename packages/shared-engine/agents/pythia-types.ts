/**
 * PYTHIA ORACLE — Type Definitions
 * Advisory-only Tier 2 signal.
 */

export interface PythiaSignal {
  activated: boolean;                    // false = silent, stop here
  triggerReason: PythiaTrigger | null;   // which condition fired
  recommendation: string;                // Anton-density: structured, no filler
  top3Scenarios: PythiaScenario[];       // exactly 3, ranked by confidence
  triadEndorsed: PythiaScenario;         // Троица's recommended pick from top3
  confidence: number;                    // 0.0–1.0
  operatorDecisionRequired: true;        // always true — hardcoded
}

export interface PythiaScenario {
  rank: 1 | 2 | 3;
  label: string;                         // short name
  rationale: string;                     // why this scenario
  riskLevel: 'low' | 'medium' | 'high';
  candidateRef?: string;                 // link to triad candidate if applicable
}

export type PythiaTrigger =
  | 'AGENT_CONFLICT'
  | 'ENTROPY_SPIKE'
  | 'INTEGRITY_LOCK_ACTIVE'
  | 'TRIAD_DEADLOCK'
  | 'OPERATOR_INVOKE';
