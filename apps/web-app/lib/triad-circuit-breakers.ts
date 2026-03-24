import { TriadCircuitBreaker } from "@alchemist/shared-engine";
import type { Panelist } from "@alchemist/shared-types";

/**
 * **Process-local** breakers per wire id — MOVE 2 (IOM V5). Warm Node instances share state;
 * cold serverless invocations reset windows (acceptable degradation vs timeout storms).
 */
const breakers = new Map<Panelist, TriadCircuitBreaker>();

export function getTriadCircuitBreakerForPanelist(panelist: Panelist): TriadCircuitBreaker {
  let b = breakers.get(panelist);
  if (!b) {
    b = new TriadCircuitBreaker();
    breakers.set(panelist, b);
  }
  return b;
}

/** Panelists whose breaker is **`open`** (not half-open / closed). */
export function listOpenTriadCircuitPanelists(): Panelist[] {
  const out: Panelist[] = [];
  for (const p of ["DEEPSEEK", "LLAMA", "QWEN"] as const) {
    const b = breakers.get(p);
    if (b !== undefined && b.getPhase() === "open") {
      out.push(p);
    }
  }
  return out;
}
