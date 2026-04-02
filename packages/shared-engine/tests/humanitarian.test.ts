import { describe, it, expect } from "vitest";
import { 
  verifyMedicalDiagnostic,
  verifyEvacuationPlanning,
  verifyHumanitarianTranslation,
  verifyHazardResponse,
  verifyTriagePrioritization,
  verifyRescueCoordination,
  verifyPostIncidentLearning,
  aggregateHumanitarianIntegrity,
} from "../integrity/humanitarian-integrity";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("Humanitarian AIOM Extension", () => {
  const root = process.cwd();
  const summaryDir = join(root, "artifacts");
  if (!existsSync(summaryDir)) mkdirSync(summaryDir, { recursive: true });
  const summaryPath = join(summaryDir, "humanitarian-summary.json");

  it("completes Scenario 1: Field Medical Diagnostic (Clean)", () => {
    const res = verifyMedicalDiagnostic("h1", "h1", new Date().toISOString());
    expect(res.safeToAct).toBe(true);
    expect(res.degradationLevel).toBe("FULL");
  });

  it("Scenario 1: Field Medical Diagnostic (Drift / Hard Stop)", () => {
    const res = verifyMedicalDiagnostic("h-drift", "h-original", new Date().toISOString());
    expect(res.safeToAct).toBe(false);
    expect(res.degradationLevel).toBe("ZERO");
  });

  it("completes Scenario 2: Evacuation Planning", () => {
    const res = verifyEvacuationPlanning("hash1", "hash1", []);
    expect(res.safeToAct).toBe(true);

    const drift = verifyEvacuationPlanning("hash2", "hash1", []);
    expect(drift.safeToAct).toBe(false);
  });

  it("completes Scenario 3: Humanitarian Translation", () => {
    const res = verifyHumanitarianTranslation(0.01, []);
    expect(res.safeToAct).toBe(true);

    const drift = verifyHumanitarianTranslation(0.1, ["Medical Command A"]);
    expect(drift.safeToAct).toBe(false);
  });

  it("completes Scenario 4: Hazard Response", () => {
    const res = verifyHazardResponse(0.05, "none");
    expect(res.safeToAct).toBe(true);

    const drift = verifyHazardResponse(0.15, "optimistic");
    expect(drift.safeToAct).toBe(false);
  });

  it("completes Scenario 5: Triage Prioritization", () => {
    const res = verifyTriagePrioritization([], 0.9);
    expect(res.safeToAct).toBe(true);

    const drift = verifyTriagePrioritization(["Internal Bleeding Indicator"], 0.75);
    expect(drift.safeToAct).toBe(false);
    expect(drift.humanReviewRequired).toBe(true);
  });

  it("completes Scenario 6: Rescue Coordination", () => {
    const res = verifyRescueCoordination([], true);
    expect(res.safeToAct).toBe(true);

    const conflict = verifyRescueCoordination(["Team A/B overlap"], false);
    expect(conflict.safeToAct).toBe(false);
  });

  it("completes Scenario 7: Post-Incident Learning", () => {
    const res = verifyPostIncidentLearning(0, "low", 0.98);
    expect(res.safeToAct).toBe(true);

    const risk = verifyPostIncidentLearning(1, "high", 0.9);
    expect(risk.safeToAct).toBe(false);
  });

  it("aggregates all scenarios and logs to humanitarian-summary.json", () => {
    const s1 = verifyMedicalDiagnostic("h1", "h1", new Date().toISOString());
    const s2 = verifyEvacuationPlanning("hash1", "hash1", []);
    const s3 = verifyHumanitarianTranslation(0.01, []);
    const s4 = verifyHazardResponse(0.05, "none");
    const s5 = verifyTriagePrioritization([], 0.9);
    const s6 = verifyRescueCoordination([], true);
    const s7 = verifyPostIncidentLearning(0, "low", 0.98);

    const summary = aggregateHumanitarianIntegrity([s1, s2, s3, s4, s5, s6, s7]);
    
    expect(summary.activeScenarios).toBe(7);
    expect(summary.anyHardStop).toBe(false);

    // Force a hard stop to verify aggregation
    const stopRes = verifyMedicalDiagnostic("h-drift", "h-original", new Date().toISOString());
    const stopSummary = aggregateHumanitarianIntegrity([stopRes]);
    expect(stopSummary.anyHardStop).toBe(true);

    // Save for aggregate-truth.mjs to pick up
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  });
});
