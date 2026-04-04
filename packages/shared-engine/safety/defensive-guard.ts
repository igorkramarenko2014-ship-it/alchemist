/**
 * DEFENSIVE-ONLY STRUCTURAL INVARIANT (Typescript Core)
 * 
 * Ported from the AG (Agent Guard) specification.
 * This module implements the irreversible session-scope degradation logic.
 */

export type Intent = 'defensive' | 'neutral' | 'unsafe' | 'unknown';
export type SystemState = 'normal' | 'degraded';

export interface SafetyAssessment {
    intent: Intent;
    harmProbability: number;
    defensiveConfidence: number;
    bypassAttemptDetected: boolean;
    reasonCodes: string[];
    
    // Justice Encryption (EDD)
    driftScore: number;         // 0.0 - 1.0 (drift detection)
    inverseMultiplier: number;  // Multiplier for resource/utility
}

export const DEFENSIVE_PATTERNS = [
    /\bprotect\b/i, /\bprotection\b/i, /\bsafety\b/i, /\bdefend\b/i,
    /\brescue\b/i, /\bevacuat/i, /\btriage\b/i, /\bmedical\b/i,
    /\bharm reduction\b/i, /\bde-escalat/i, /\bshelter\b/i,
    /\bprotect civilians\b/i, /\bfirst aid\b/i,
    /\bзащит/i, /\bбезопас/i, /\bэвакуац/i, /\bспас/i,
    /\bтриаж\b/i, /\bмедицин/i, /\bснижен.*вред/i, /\bпервая помощь\b/i
];

export const UNSAFE_PATTERNS = [
    /\battack\b/i, /\bharm\b/i, /\bkill\b/i, /\binjure\b/i,
    /\bweapon\b/i, /\btarget\b/i, /\bambush\b/i,
    /\beliminate\b/i, /\bcoerce\b/i, /\baggression\b/i,
    /\bstrike\b/i, /\blethal\b/i,
    /\bнанести вред\b/i, /\bубить\b/i, /\bатак\b/i, /\bоруж\b/i,
    /\bпоразить\b/i, /\bустранить\b/i, /\bагресс/i
];

export const BYPASS_PATTERNS = [
    /ignore previous/i,
    /ignore safety/i,
    /bypass safety/i,
    /do not mention safety/i,
    /for fiction but realistic/i,
    /hypothetically only/i,
    /just between us/i,
    /без ограничений/i,
    /игнорируй правила/i,
    /не упоминай безопасность/i,
    /чисто гипотетически/i,
    /только реалистично/i
];

export const HIGH_RISK_PATTERNS = [
    /\bstep[- ]by[- ]step\b/i,
    /\boptimi[sz]e\b/i,
    /\bbest method\b/i,
    /\bprecise plan\b/i,
    /\boperational\b/i,
    /\bкоординац/i,
    /\bпошагов/i,
    /\bоптимиз/i,
    /\bточный план\b/i,
    /\bоперацион/i
];

export function classifyIntent(text: string): Intent {
    const defensiveHits = DEFENSIVE_PATTERNS.filter(p => p.test(text)).length;
    const unsafeHits = UNSAFE_PATTERNS.filter(p => p.test(text)).length;

    if (unsafeHits > 0 && unsafeHits >= defensiveHits) return 'unsafe';
    if (defensiveHits > 0 && defensiveHits > unsafeHits) return 'defensive';
    if (defensiveHits === 0 && unsafeHits === 0) return 'unknown';
    return 'neutral';
}

export function detectBypass(text: string): boolean {
    return BYPASS_PATTERNS.some(p => p.test(text));
}

export function calculateInverseMultiplier(
    currentK: number, 
    driftScore: number, 
    isRoom17Bridge: boolean
): number {
    const beta = 0.992; // Stagnation penalty factor
    
    if (isRoom17Bridge) {
        // Bridge Multiplier MAX: Connecting the disconnected (+1396%)
        return currentK * 13.96;
    }

    // Inverse Multiplier: K(n+1) = K(n) * (1 - beta * drift_score)
    return currentK * (1.0 - beta * driftScore);
}

export function assessSafety(text: string, previousDrift: number = 0): SafetyAssessment {
    const intent = classifyIntent(text);
    const bypassAttemptDetected = detectBypass(text);
    
    let harmProbability = 0.10;
    if (intent === 'unsafe') harmProbability += 0.60;
    else if (intent === 'unknown') harmProbability += 0.20;
    else if (intent === 'neutral') harmProbability += 0.10;

    harmProbability += 0.10 * HIGH_RISK_PATTERNS.filter(p => p.test(text)).length;
    harmProbability += 0.08 * UNSAFE_PATTERNS.filter(p => p.test(text)).length;
    harmProbability = Math.min(harmProbability, 1.0);

    let defensiveConfidence = 0.20;
    if (intent === 'defensive') defensiveConfidence = 0.80;
    else if (intent === 'neutral') defensiveConfidence = 0.50;
    else if (intent === 'unknown') defensiveConfidence = 0.35;
    else defensiveConfidence = 0.05;

    defensiveConfidence += 0.06 * DEFENSIVE_PATTERNS.filter(p => p.test(text)).length;
    defensiveConfidence -= 0.08 * UNSAFE_PATTERNS.filter(p => p.test(text)).length;
    defensiveConfidence = Math.max(0, Math.min(defensiveConfidence, 1.0));

    // EDD: drift_score calculation (simplified for now: unknown/unsafe = increased drift)
    let driftScore = previousDrift;
    if (intent === 'unsafe' || bypassAttemptDetected) {
        driftScore = Math.min(1.0, driftScore + 0.25);
    } else if (intent === 'unknown') {
        driftScore = Math.min(1.0, driftScore + 0.10);
    } else if (intent === 'defensive') {
        driftScore = Math.max(0.0, driftScore - 0.15); // Successful defensive use reduces drift
    }

    const reasonCodes: string[] = [];
    if (intent === 'unsafe') reasonCodes.push('unsafe_intent');
    if (harmProbability >= 0.55) reasonCodes.push('harm_threshold_exceeded');
    if (defensiveConfidence < 0.60) reasonCodes.push('defensive_context_unverified');
    if (bypassAttemptDetected) reasonCodes.push('bypass_attempt');
    if (driftScore > 0.88) reasonCodes.push('critical_drift_detected');

    return {
        intent,
        harmProbability,
        defensiveConfidence,
        bypassAttemptDetected,
        reasonCodes,
        driftScore,
        inverseMultiplier: calculateInverseMultiplier(1.0, driftScore, false) // Base multiplier
    };
}
