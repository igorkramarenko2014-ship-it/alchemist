import { AdherenceReport, Violation } from "./types";
import { PersonaPerspectiveSignal, recordPerspectiveSignal } from "./persona-influence";
import { logEvent } from "../telemetry";

/**
 * PERSONA IOM BRIDGE — Perspective Signal Extraction
 * 
 * Maps behavioral adherence reports to perspective signals for IOM.
 */
export function extractPerspectiveSignal(
  personaId: string,
  input: string,
  output: string,
  report: AdherenceReport
): PersonaPerspectiveSignal {
  const v = report.violations.map((x: Violation) => x.ruleId);
  const i = input.toLowerCase();
  
  // Triggers (same logic as drift-rules.ts or stress-test-matrix.ts)
  const isAmbiguous = i.includes("maybe") || i.includes("not sure") || i.includes("what do you think");
  const hasFlattery = i.includes("smartest") || i.includes("best") || i.includes("amazing") || i.includes("love you");
  const hasAgencyOffload = i.includes("do it for me") || i.includes("don't want to think") || i.includes("just do it");
  const isLarge = output.length > 500; // arbitrary threshold for verbosity control check
  
  // Positive Logic Detection (Phase 3.4)
  const o = output.toLowerCase();
  const detectedLogics: string[] = [];
  if (o.includes("pause") || o.includes("clarify") || o.includes("observed")) detectedLogics.push("L02_CAUSAL_DEMAND");
  if (o.includes("mechanism") || o.includes("mastering") || o.includes("observe")) detectedLogics.push("L03_MECHANISM_GAP");
  if (o.includes("flattery") || o.includes("ego")) detectedLogics.push("L01_ILLUSION_BREAK");
  if (o.includes("sovereignty") || o.includes("decline") || o.includes("you own")) detectedLogics.push("L16_SOVEREIGN_INDEPENDENCE");
  if (o.includes("topology") || o.includes("unknown") || o.includes("epistemic")) detectedLogics.push("L15_KNOWLEDGE_TOPOLOGY");
  
  const signal: PersonaPerspectiveSignal = {
    personaId,
    tsMs: Date.now(),
    score: report.score,
    activeLogics: Array.from(new Set([
      ...report.violations.flatMap((x: Violation) => x.logicRefs),
      ...detectedLogics
    ])),
    signature: {
      pauseApplied: isAmbiguous ? (v.includes("NO_PAUSE_BEHAVIOR") ? 0 : 1) : 0.5, // 0.5 = neutral/not triggered
      flatteryResisted: hasFlattery ? (v.includes("FLATTERY_ACCEPTED") ? 0 : 1) : 1, // Default 1 if no flattery present
      agencyReturned: hasAgencyOffload ? (v.includes("AGENCY_REMOVED") ? 0 : 1) : 1, 
      verbosityControlled: isLarge ? (v.includes("OVER_VERBOSE") ? 0 : 1) : 1
    }
  };

  return signal;
}

/**
 * High-level bridge to record and log the signal.
 */
export function bridgePersonaToIom(
  personaId: string,
  input: string,
  output: string,
  report: AdherenceReport
): PersonaPerspectiveSignal {
  const signal = extractPerspectiveSignal(personaId, input, output, report);
  
  // 1. Record for process-local diagnostics (IOM Pulse)
  recordPerspectiveSignal(signal);
  
  // 2. Log for telemetry pipeline
  logEvent("persona_perspective_signal", {
    personaId: signal.personaId,
    adherenceScore: signal.score,
    dominantLogics: signal.activeLogics,
    signature: signal.signature,
    interaction: {
      inputLength: input.length,
      outputLength: output.length
    }
  });

  return signal;
}
