/**
 * PERSONA PERSPECTIVE INGESTION — Observational Signal Storage
 * 
 * Each persona contributes a communication-angle profile to IOM.
 * This is perspective enrichment, NOT identity transfer.
 */

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
  signatureRates: {
    pauseRate: number;
    flatteryResistanceRate: number;
    agencyReturnRate: number;
    verbosityControlRate: number;
  };
  driftRisk: "low" | "medium" | "high";
}

const RING_MAX_SIGNALS = 100;
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
  win.forEach(s => s.activeLogics.forEach(l => {
    logicCounts[l] = (logicCounts[l] || 0) + 1;
  }));
  
  const dominantLogics = Object.entries(logicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([l]) => l);

  const signatureRates = {
    pauseRate: sum(s => s.signature.pauseApplied) / n,
    flatteryResistanceRate: sum(s => s.signature.flatteryResisted) / n,
    agencyReturnRate: sum(s => s.signature.agencyReturned) / n,
    verbosityControlRate: sum(s => s.signature.verbosityControlled) / n
  };

  return {
    personaId,
    sampleSize: n,
    stabilityScore,
    dominantLogics,
    signatureRates,
    driftRisk: stabilityScore > 0.85 ? "low" : stabilityScore > 0.7 ? "medium" : "high"
  };
}

/** Test helper */
export function __resetPersonaInfluenceForTests(): void {
  signalRing.length = 0;
}
