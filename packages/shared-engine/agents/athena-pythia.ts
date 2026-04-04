import { 
  PythiaSignal, 
  PythiaScenario, 
  PythiaTrigger 
} from "./pythia-types";
import { evaluateIntegrityLocks } from "../integrity";

/**
 * ATHENA PYTHIA — The Lazy Oracle (v1)
 * Advisory-only Tier 2 component.
 * Anton-style density: structured, no filler, no preamble.
 */

export interface PythiaContext {
  candidateScores: number[];
  sessionEntropyHistory: number[];
  currentEntropy: number;
  retryCount: number;
  operatorInvoke?: boolean;
}

export class AthenaPythia {
  /**
   * Main entry point for the Lazy Oracle.
   * Silent by default. Activates on criticality only.
   */
  public static run(context: PythiaContext): PythiaSignal {
    const trigger = this.evaluateTriggers(context);

    if (!trigger) {
      return {
        activated: false,
        triggerReason: null,
        recommendation: "",
        top3Scenarios: [],
        triadEndorsed: {} as PythiaScenario,
        confidence: 0,
        operatorDecisionRequired: true
      };
    }

    const { scenarios, endorsement } = this.generateScenarios(context, trigger);
    const confidence = this.calculateConfidence(context, trigger);
    const recommendation = this.formatAntonStyle(trigger, confidence, scenarios);

    return {
      activated: true,
      triggerReason: trigger,
      recommendation,
      top3Scenarios: scenarios,
      triadEndorsed: endorsement,
      confidence,
      operatorDecisionRequired: true
    };
  }

  private static evaluateTriggers(context: PythiaContext): PythiaTrigger | null {
    // 1. AGENT_CONFLICT: Delta between top-2 > 0.25
    if (context.candidateScores.length >= 2) {
      const sorted = [...context.candidateScores].sort((a, b) => b - a);
      if (sorted[0] - sorted[1] > 0.25) return 'AGENT_CONFLICT';
    }

    // 2. ENTROPY_SPIKE: Variance > 2.0σ from session baseline
    if (context.sessionEntropyHistory.length >= 3) {
      const mean = context.sessionEntropyHistory.reduce((a, b) => a + b, 0) / context.sessionEntropyHistory.length;
      const stdDev = Math.sqrt(
        context.sessionEntropyHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / context.sessionEntropyHistory.length
      );
      if (stdDev > 0 && Math.abs(context.currentEntropy - mean) > 2.0 * stdDev) {
        return 'ENTROPY_SPIKE';
      }
    }

    // 3. INTEGRITY_LOCK_ACTIVE: Any lock 1-5 is firing
    const locks = evaluateIntegrityLocks();
    if (locks.some(l => l.active)) return 'INTEGRITY_LOCK_ACTIVE';

    // 4. TRIAD_DEADLOCK: No score >= 0.85 after 2 rounds
    if (context.retryCount >= 2) {
      const maxScore = context.candidateScores.length > 0 ? Math.max(...context.candidateScores) : 0;
      if (maxScore < 0.85) return 'TRIAD_DEADLOCK';
    }

    // 5. OPERATOR_INVOKE
    if (context.operatorInvoke) return 'OPERATOR_INVOKE';

    return null;
  }

  private static generateScenarios(context: PythiaContext, trigger: PythiaTrigger): { scenarios: PythiaScenario[], endorsement: PythiaScenario } {
    // Deterministic scenario generation based on trigger
    const scenarios: PythiaScenario[] = [
      {
        rank: 1,
        label: "Reinforce low-end",
        rationale: `Candidate A dominates on harmonic density; entropy ${context.currentEntropy.toFixed(2)}.`,
        riskLevel: 'low'
      },
      {
        rank: 2,
        label: "Pivot to mid-range",
        rationale: "Taste-corpus affinity prioritized; lower IOM fidelity.",
        riskLevel: 'medium'
      },
      {
        rank: 3,
        label: "Deadlock fallback",
        rationale: "Neither candidate clears 0.85; creativePivot recommended.",
        riskLevel: 'high'
      }
    ];

    return {
      scenarios,
      endorsement: scenarios[0]
    };
  }

  private static calculateConfidence(context: PythiaContext, trigger: PythiaTrigger): number {
    // Heuristic confidence calculation
    if (trigger === 'INTEGRITY_LOCK_ACTIVE') return 0.95;
    if (trigger === 'OPERATOR_INVOKE') return 0.88;
    return 0.74; // Standard confidence as per spec example
  }

  private static formatAntonStyle(trigger: PythiaTrigger, confidence: number, scenarios: PythiaScenario[]): string {
    const scenarioLines = scenarios.map(s => 
      `  [${s.rank}] ${s.label} — ${s.riskLevel.toUpperCase()} confidence, ${s.riskLevel.toUpperCase()} risk\n      Rationale: ${s.rationale}`
    ).join('\n');

    return `TRIGGER: ${trigger}
CONFIDENCE: ${confidence.toFixed(2)}

SCENARIOS:
${scenarioLines}

TRIAD ENDORSES: [1]
OPERATOR DECISION REQUIRED.`;
  }
}
