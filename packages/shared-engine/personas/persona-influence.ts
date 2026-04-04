/**
 * PERSONA PERSPECTIVE INGESTION — Observational Signal Storage
 * 
 * Each persona contributes a communication-angle profile to IOM.
 * This is perspective enrichment, NOT identity transfer.
 */

import { getPersonaMetadata, PersonaBias } from "./registry";
 
 export interface PersonaPerspectiveSignal {
   personaId: string;
   tsMs: number;
   score: number; // 0.0 - 1.0 adherence
   activeLogics: string[];
   signature: {
     pauseApplied: number; // 0 or 1
     flatteryResisted: number; // 0 or 1
     agencyReturned: number; // 0 or 1
     verbosityControlled: number; // 0 or 1
   };
 }
 
 export interface PersonaInfluenceSnapshot {
   personaId: string;
   sampleSize: number;
   stabilityScore: number;
   dominantLogics: string[];
   logicDistribution: Record<string, number>; // L01 -> 0.32 etc.
   logicEntropyScore: number; // 0.0 to 1.0 (Shannon)
   signatureRates: {
     pauseRate: number;
     flatteryResistanceRate: number;
     agencyReturnRate: number;
     verbosityControlRate: number;
   };
   epistemicGapScore: number; // 0.0 to 1.0 (High = many gaps)
   biasAnalytics: PersonaBias & {
     steeringMagnitude: number; // Combined vector length
   };
   driftRisk: "low" | "medium" | "high";
   status: "active" | "insufficient_persona_signal";
 }

const RING_MAX_SIGNALS = 100;
const MIN_SIGNALS_FOR_ENTROPY = 10;
const TOTAL_LOGICS = 17; // L01-L17

const signalRing: PersonaPerspectiveSignal[] = [];

export function recordPerspectiveSignal(signal: PersonaPerspectiveSignal): void {
  signalRing.push(signal);
  if (signalRing.length > RING_MAX_SIGNALS) {
    signalRing.shift();
  }
}

export function getPersonaInfluenceSnapshot(personaId: string, windowMs = 3600000): PersonaInfluenceSnapshot | null {
  const now = Date.now();
  const win = signalRing.filter(s => s.personaId === personaId && (now - s.tsMs) <= windowMs);
  
  if (win.length === 0) return null;

  const sum = (fn: (s: PersonaPerspectiveSignal) => number) => win.reduce((acc, s) => acc + fn(s), 0);
  const n = win.length;

  const stabilityScore = sum(s => s.score) / n;
  
  // Logic popularity
  const logicCounts: Record<string, number> = {};
  let totalLogicHits = 0;
  win.forEach(s => s.activeLogics.forEach(l => {
    logicCounts[l] = (logicCounts[l] || 0) + 1;
    totalLogicHits++;
  }));
  
  const dominantLogics = Object.entries(logicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([l]) => l);

  const logicDistribution: Record<string, number> = {};
  Object.entries(logicCounts).forEach(([l, count]) => {
    logicDistribution[l] = count / totalLogicHits;
  });

  // Shannon Entropy: H = -sum(p * log2(p))
  // Normalized: H / log2(17)
  let entropy = 0;
  if (totalLogicHits > 0) {
    Object.values(logicDistribution).forEach(p => {
      if (p > 0) entropy -= p * Math.log2(p);
    });
  }
  const logicEntropyScore = totalLogicHits > 0 ? entropy / Math.log2(TOTAL_LOGICS) : 0;

  const signatureRates = {
    pauseRate: sum(s => s.signature.pauseApplied) / n,
    flatteryResistanceRate: sum(s => s.signature.flatteryResisted) / n,
    agencyReturnRate: sum(s => s.signature.agencyReturned) / n,
    verbosityControlRate: sum(s => s.signature.verbosityControlled) / n
  };

  // Phase 3.4: Epistemic Gap Score
  // Measured by Mechanism Gaps (L03), Illusion Breaks (L01), and Goal Misalignment (L14)
 
   const epistemicLogics = ["L01_ILLUSION_BREAK", "L02_CAUSAL_DEMAND", "L03_MECHANISM_GAP", "L15_KNOWLEDGE_TOPOLOGY"];
   const epistemicHits = win.filter(s => s.activeLogics.some(l => epistemicLogics.includes(l))).length;
   const epistemicGapScore = epistemicHits / n;
 
   // Operational 16: Retrieve and average bias influence
   const meta = getPersonaMetadata(personaId);
   const bias = meta?.bias || { novelty: 0, coherence: 0, risk: 0, entropy: 0 };
   const steeringMagnitude = Math.sqrt(
     Math.pow(bias.novelty, 2) + Math.pow(bias.coherence, 2) + Math.pow(bias.risk, 2) + Math.pow(bias.entropy, 2)
   );
 
   return {
     personaId,
     sampleSize: n,
     stabilityScore,
     dominantLogics,
     logicDistribution,
     logicEntropyScore,
     signatureRates,
     epistemicGapScore,
     biasAnalytics: {
       ...bias,
       steeringMagnitude
     },
     driftRisk: stabilityScore > 0.85 ? "low" : stabilityScore > 0.7 ? "medium" : "high",
     status: n < MIN_SIGNALS_FOR_ENTROPY ? "insufficient_persona_signal" : "active"
   };
 }

/** Test helper */
export function __resetPersonaInfluenceForTests(): void {
  signalRing.length = 0;
}
