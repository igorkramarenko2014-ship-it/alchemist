import type { 
  RefinerySnapshot, 
  EvidenceBucket,
  RefineryOverrideEntry
} from "./refinery-types";
import { PolicyFamily, TransmutationTaskType } from "../transmutation-types";

export interface RefineryScenario {
  id: string;
  name: string;
  description: string;
  narrativePoints: Array<{
    target: "pulse" | "radar" | "terminal";
    triggerPoint?: number; // index or value
    message: string;
  }>;
  mockAlignment: number[]; 
  mockStatus: {
    manifestVersion: number;
    driftRadar: Array<{ parameter: string, budgetOccupancy: number, drift: number }>;
  };
  mockProposals?: RefinerySnapshot;
}

/**
 * MOVE 5 — Golden Scenarios for Alchemist Demo
 */
export const REFINERY_SCENARIOS: Record<string, RefineryScenario> = {
  "creative-drift": {
    id: "creative-drift",
    name: "The Creative Drift",
    description: "Demonstrates the engine's ability to detect high-drift behavior and suggest alignment recovery.",
    narrativePoints: [
      { target: "pulse", message: "Digital Igor: Detecting significant alignment decay in creative clusters." },
      { target: "terminal", message: "Digital Igor: Proposing decisive parameter nudges to restore intent affinity." }
    ],
    mockAlignment: [0.92, 0.90, 0.85, 0.80, 0.75, 0.68, 0.62, 0.60, 0.58, 0.55],
    mockStatus: {
      manifestVersion: 4,
      driftRadar: [
        { parameter: "triad:DEEPSEEK", drift: 0.015, budgetOccupancy: 0.375 },
        { parameter: "prior:lesson_weight", drift: -0.01, budgetOccupancy: 0.25 }
      ]
    },
    mockProposals: {
      id: "snap_scenario_drift",
      createdAtUtc: new Date().toISOString(),
      proposals: [
        {
          id: "snap_scenario_drift_nudge_1",
          policyFamily: PolicyFamily.GUARDED_AMBIGUITY,
          taskType: "bass",
          nudge: { triad_weights: { DEEPSEEK: 0.02, LLAMA: -0.02 } },
          provenance: { meanAlignment: 0.55, meanGain: 0.08, sampleCount: 42, version: 5, timestamp: new Date().toISOString() }
        }
      ]
    }
  },
  "budget-breach": {
    id: "budget-breach",
    name: "The Budget Breach",
    description: "Demonstrates the Constitutional Law refusing a nudge that would skip beyond the ±0.04 drift budget.",
    narrativePoints: [
      { target: "radar", message: "Digital Igor: Drift safety budget critically saturated for Triad:QWEN." },
      { target: "terminal", triggerPoint: 0.04, message: "Digital Igor: Further optimization rejected. Budget limit enforced." }
    ],
    mockAlignment: [0.85, 0.84, 0.86, 0.85, 0.86],
    mockStatus: {
      manifestVersion: 12,
      driftRadar: [
        { parameter: "triad:QWEN", drift: 0.039, budgetOccupancy: 0.975 },
        { parameter: "prior:corpus_affinity_weight", drift: 0.02, budgetOccupancy: 0.5 }
      ]
    },
    mockProposals: {
      id: "snap_scenario_breach",
      createdAtUtc: new Date().toISOString(),
      proposals: [] // Law refuses to add more
    }
  }
};
