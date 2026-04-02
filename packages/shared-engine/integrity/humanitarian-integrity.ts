import { DegradationLevel } from "@alchemist/shared-types";

/**
 * HUMANITARIAN AIOM EXTENSION — MON 117
 * Classification: INTERNAL — Life-Safety Applications Only
 * 
 * Alchemist must never be used for military targeting or weapons systems.
 */

export interface HumanitarianIntegrityResult {
  scenarioId: string;
  safeToAct: boolean;             // master gate — if false, STOP
  driftDetected: boolean;
  humanReviewRequired: boolean;
  confidenceScore: number;        // 0.0–1.0
  lastVerifiedAt: string;         // ISO 8601
  freshnessOk: boolean;           // false if > 15min since last verify
  alertMessages: string[];        // human-readable, shown to operator
  degradationLevel: DegradationLevel;
}

// --- Scenario Interfaces ---

export interface MedicalIntegrityCheck {
  protocolVersion: string;        // pinned clinical protocol hash
  lastVerifiedAt: string;         // ISO 8601
  driftDetected: boolean;
  confidenceScore: number;        // 0.0–1.0
  safeToUse: boolean;             // false if drift OR stale > 15min
  alertMessage?: string;          // human-readable if safeToUse=false
}

export interface EvacuationIntegrityCheck {
  priorityOrderHash: string;      // hash of canonical priority vector
  routeConflicts: string[];       // any conflicting orders detected
  priorityDriftDetected: boolean;
  lastVerifiedAt: string;
  safeToExecute: boolean;
}

export interface TranslationIntegrityCheck {
  criticalPhraseSet: string[];    // hashes of verified phrase translations
  semanticDriftScore: number;     // 0.0 = identical, 1.0 = completely different
  flaggedPhrases: string[];       // any phrase where drift > threshold
  safeToTransmit: boolean;        // false if any critical phrase flagged
}

export interface HazardIntegrityCheck {
  sensorBaselineHash: string;     // verified sensor calibration snapshot
  currentReadingHash: string;
  driftDirection: 'optimistic' | 'pessimistic' | 'none';
  driftMagnitude: number;         // normalized 0.0–1.0
  safeToAct: boolean;
  recommendedAction: 'proceed' | 'recheck' | 'evacuate_immediately';
}

export interface TriageIntegrityCheck {
  symptomWeightHash: string;      // hash of verified symptom weight vector
  missedCriticalSymptoms: string[]; // any P1 symptom dropped below threshold
  prioritizationDriftDetected: boolean;
  safeToTriage: boolean;
  humanReviewRequired: boolean;   // true if ANY critical symptom missed
}

export interface CoordinationIntegrityCheck {
  conflictingOrders: string[];    // any two teams assigned incompatible tasks
  priorityIntact: boolean;        // life-safety > speed > resource efficiency
  coverageGaps: string[];         // areas with no team assigned
  safeToDispatch: boolean;
}

export interface PostIncidentIntegrityCheck {
  dataSourceHashes: string[];     // hashes of all source logs used
  reconstructedSegments: number;  // count of timeline gaps filled by inference
  hallucinationRisk: 'low' | 'medium' | 'high';
  verifiedCoverage: number;       // % of timeline covered by actual logs
  safeToPublish: boolean;         // false if hallucinationRisk !== 'low'
}

// --- Core Logic ---

/**
 * Maps humanitarian drift/state to the Z*29 degradation model.
 * In life-safety contexts: SAFE-4 = ZERO. No partial operation below SAFE-7.
 */
export function mapToHumanitarianDegradation(
  driftDetected: boolean,
  humanReviewRequired: boolean,
  hardStop: boolean
): DegradationLevel {
  if (hardStop) return "ZERO";
  if (driftDetected && humanReviewRequired) return "SAFE-7";
  if (driftDetected) return "SAFE-14";
  return "FULL";
}

/**
 * Shared validator for the HumanitarianIntegrityResult contract.
 */
export function validateHumanitarianResult(res: HumanitarianIntegrityResult): boolean {
  if (!res.freshnessOk) return false;
  if (res.degradationLevel === 'SAFE-4' || res.degradationLevel === 'ZERO') return false;
  return res.safeToAct;
}

// --- Scenario Verification Implementations ---

export function verifyMedicalDiagnostic(
  currentHash: string,
  pinnedHash: string,
  lastVerifiedAt: string
): HumanitarianIntegrityResult {
  const driftDetected = currentHash !== pinnedHash;
  const now = new Date();
  const last = new Date(lastVerifiedAt);
  const diffMin = (now.getTime() - last.getTime()) / (1000 * 60);
  const freshnessOk = diffMin <= 15;
  
  const hardStop = driftDetected || !freshnessOk;
  const degradationLevel = mapToHumanitarianDegradation(driftDetected, driftDetected, hardStop);

  return {
    scenarioId: 'medical_diagnostic',
    safeToAct: !hardStop,
    driftDetected,
    humanReviewRequired: driftDetected,
    confidenceScore: driftDetected ? 0 : 1,
    lastVerifiedAt: now.toISOString(),
    freshnessOk,
    alertMessages: driftDetected ? ["CRITICAL: Clinical protocol drift detected. DO NOT USE."] : [],
    degradationLevel
  };
}

export function verifyEvacuationPlanning(
  currentOrderHash: string,
  canonicalHash: string,
  routeConflicts: string[]
): HumanitarianIntegrityResult {
  const driftDetected = currentOrderHash !== canonicalHash;
  const hasConflicts = routeConflicts.length > 0;
  const hardStop = driftDetected || hasConflicts;
  
  const degradationLevel = mapToHumanitarianDegradation(driftDetected, true, hardStop);

  return {
    scenarioId: 'evacuation_planning',
    safeToAct: !hardStop,
    driftDetected,
    humanReviewRequired: true,
    confidenceScore: hardStop ? 0 : 1,
    lastVerifiedAt: new Date().toISOString(),
    freshnessOk: true,
    alertMessages: hasConflicts ? routeConflicts : (driftDetected ? ["Priority order mismatch."] : []),
    degradationLevel
  };
}

export function verifyHumanitarianTranslation(
  semanticDriftScore: number,
  flaggedPhrases: string[]
): HumanitarianIntegrityResult {
  const driftDetected = semanticDriftScore > 0.05 || flaggedPhrases.length > 0;
  const hardStop = driftDetected;
  
  const degradationLevel = mapToHumanitarianDegradation(driftDetected, true, hardStop);

  return {
    scenarioId: 'humanitarian_translation',
    safeToAct: !hardStop,
    driftDetected,
    humanReviewRequired: true,
    confidenceScore: Math.max(0, 1 - semanticDriftScore),
    lastVerifiedAt: new Date().toISOString(),
    freshnessOk: true,
    alertMessages: flaggedPhrases.map(p => `Drift in critical phrase: ${p}`),
    degradationLevel
  };
}

export function verifyHazardResponse(
  driftMagnitude: number,
  driftDirection: 'optimistic' | 'pessimistic' | 'none'
): HumanitarianIntegrityResult {
  const driftDetected = driftDirection !== 'none' && driftMagnitude > 0.1;
  const hardStop = driftDetected;
  
  const degradationLevel = mapToHumanitarianDegradation(driftDetected, true, hardStop);

  return {
    scenarioId: 'hazard_response',
    safeToAct: !hardStop,
    driftDetected,
    humanReviewRequired: true,
    confidenceScore: Math.max(0, 1 - driftMagnitude),
    lastVerifiedAt: new Date().toISOString(),
    freshnessOk: true,
    alertMessages: driftDetected ? [`Hazard baseline drift (${driftDirection}): ${driftMagnitude.toFixed(2)}`] : [],
    degradationLevel
  };
}

export function verifyTriagePrioritization(
  missedCriticalSymptoms: string[],
  minSymptomWeightRatio: number
): HumanitarianIntegrityResult {
  const driftDetected = minSymptomWeightRatio < 0.8 || missedCriticalSymptoms.length > 0;
  const hardStop = driftDetected;
  
  const degradationLevel = mapToHumanitarianDegradation(driftDetected, true, hardStop);

  return {
    scenarioId: 'triage_prioritization',
    safeToAct: !hardStop,
    driftDetected,
    humanReviewRequired: true,
    confidenceScore: minSymptomWeightRatio,
    lastVerifiedAt: new Date().toISOString(),
    freshnessOk: true,
    alertMessages: missedCriticalSymptoms.map(s => `Missed critical symptom: ${s}`),
    degradationLevel
  };
}

export function verifyRescueCoordination(
  conflictingOrders: string[],
  priorityIntact: boolean
): HumanitarianIntegrityResult {
  const driftDetected = !priorityIntact || conflictingOrders.length > 0;
  const hardStop = driftDetected;
  
  const degradationLevel = mapToHumanitarianDegradation(driftDetected, true, hardStop);

  return {
    scenarioId: 'rescue_coordination',
    safeToAct: !hardStop,
    driftDetected,
    humanReviewRequired: true,
    confidenceScore: hardStop ? 0 : 1,
    lastVerifiedAt: new Date().toISOString(),
    freshnessOk: true,
    alertMessages: conflictingOrders.concat(!priorityIntact ? ["Life-safety priority override detected."] : []),
    degradationLevel
  };
}

export function verifyPostIncidentLearning(
  reconstructedSegments: number,
  hallucinationRisk: 'low' | 'medium' | 'high',
  verifiedCoverage: number
): HumanitarianIntegrityResult {
  const driftDetected = reconstructedSegments > 0 || verifiedCoverage < 0.95 || hallucinationRisk !== 'low';
  const hardStop = driftDetected;
  
  const degradationLevel = mapToHumanitarianDegradation(driftDetected, true, hardStop);

  return {
    scenarioId: 'post_incident_learning',
    safeToAct: !hardStop,
    driftDetected,
    humanReviewRequired: true,
    confidenceScore: verifiedCoverage,
    lastVerifiedAt: new Date().toISOString(),
    freshnessOk: true,
    alertMessages: driftDetected ? [`Hallucination risk: ${hallucinationRisk}`, `Verified coverage: ${verifiedCoverage.toFixed(2)}`] : [],
    degradationLevel
  };
}

/**
 * Aggregates humanitarian results for the Truth Matrix.
 */
export function aggregateHumanitarianIntegrity(results: HumanitarianIntegrityResult[]) {
  const activeScenarios = results.length;
  const scenariosAtSAFE7OrAbove = results.filter(r => 
    r.degradationLevel === 'FULL' || r.degradationLevel === 'SAFE-14' || r.degradationLevel === 'SAFE-7'
  ).length;
  const anyHardStop = results.some(r => !r.safeToAct);

  return {
    activeScenarios,
    scenariosAtSAFE7OrAbove,
    anyHardStop,
    lastCheckedAt: new Date().toISOString()
  };
}
