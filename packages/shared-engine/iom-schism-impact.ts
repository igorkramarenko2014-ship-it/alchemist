/**
 * Maps **IOM schism codes** to **power cell ids** for SOE / Great Library traceability.
 * Diagnostic only — does not mutate gates.
 */
export const IOM_SCHISM_AFFECTED_CELLS: Readonly<Record<string, readonly string[]>> = {
  IOM_CELL_POLICY_DRIFT: ["integrity", "schism"],
  PARTIAL_TRIAD_VELOCITY: ["triad", "triad_governance"],
  TRIAD_CIRCUIT_OPEN: ["triad"],
  WASM_EXPORT_OFF: ["integrity"],
  MODEL_GATE_DECOUPLE: ["slavic_score", "undercover_adversarial", "gatekeeper"],
  STUB_LIVE_MISMATCH: ["triad", "soe"],
  PIPELINE_SILENT_CHOKE: ["undercover_adversarial", "slavic_score", "gatekeeper"],
  LATENCY_WITHOUT_STRESS: ["triad", "prompt_guard"],
};

/** Unique sorted cell ids implied by the given schism codes. */
export function getAffectedIomCellsFromSchismCodes(codes: readonly string[]): string[] {
  const s = new Set<string>();
  for (const c of codes) {
    for (const id of IOM_SCHISM_AFFECTED_CELLS[c] ?? []) s.add(id);
  }
  return Array.from(s).sort();
}
