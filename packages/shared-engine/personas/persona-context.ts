/**
 * PERSONA CONTEXT LAYER — Advisory Signal Injection
 * 
 * Mirrors the Engine School pattern to inject persona roles as
 * an advisory prefix to the triad prompt.
 */

import { OracleSignal } from "./oracle-governor";
import { PYTHIA_LAWS, GOLDEN_ANCHORS } from "./oracle-calibration";

export interface PersonaAugmentation {
  contextPrefix: string;
  activePersonas: string[];
  contextCharCount: number;
  oracleSignal?: OracleSignal;
}

import { FRAMEWORK_OF_16 } from "./registry";
 
 const PERSONA_ROLE_SIGNALS: Record<string, string> = Object.fromEntries(
   Object.values(FRAMEWORK_OF_16).map(m => [m.id, m.roleSignal])
 );

/**
 * Builds the advisory context block for the triad prompt.
 * 
 * "Pythia reduces ego-resistance to truth without mutating truth itself."
 */
export function getPersonaContextAugmentation(
  personaIds?: string[],
  options?: { enabled?: boolean; oracleSignal?: OracleSignal }
): PersonaAugmentation | null {
  // 1. Guard check (mirror Engine School pattern)
  if (!options?.enabled) {
    return null;
  }

  const ids = personaIds && personaIds.length > 0 
    ? personaIds 
    : ["svitlana_v1", "anton_v1", "elisey_v1"];
    
  // 3. Filter only those with known signals
  const active = ids.filter(id => !!PERSONA_ROLE_SIGNALS[id]);
  
  if (active.length === 0) {
    return null;
  }

  const sig = options.oracleSignal;

  // 4. Build the context block
  const lines = [
    "[ADVISORY PERSONA CONTEXT — PYTHIAN GOVERNANCE]",
    sig ? `[SIGNAL: LEAD=${sig.leadPersona.toUpperCase()} DEPTH=${sig.depthLevel.toFixed(2)} WARMTH=${sig.warmth.toFixed(2)}]` : "",
    `LAW: ${PYTHIA_LAWS.LAW_1_DELIVERY_NOT_CONTENT}`,
    sig?.deferTruth ? "> WARNING: Readiness low. Defer high-impact truth delivery." : "",
    ...active.map(id => {
      const isLead = sig?.leadPersona && id.startsWith(sig.leadPersona);
      return `- ${id.toUpperCase()}: ${PERSONA_ROLE_SIGNALS[id]}${isLead ? " (PRIMARY ANCHOR)" : ""}`;
    }),
    sig?.warmth && sig.warmth > 0.8 ? `POINT_OF_TRUTH_ANCHOR: ${GOLDEN_ANCHORS[Math.floor(Math.random() * GOLDEN_ANCHORS.length)]}` : "",
    sig?.silenceAfter ? "[BEHAVIOR: FORMULA_OF_SILENCE ACTIVE — CEASE AFTER SIGNAL]" : "",
    "[END CONTEXT]"
  ].filter(line => line.length > 0);

  const contextPrefix = lines.join("\n");

  return {
    contextPrefix,
    activePersonas: active,
    contextCharCount: contextPrefix.length,
    oracleSignal: sig
  };
}
