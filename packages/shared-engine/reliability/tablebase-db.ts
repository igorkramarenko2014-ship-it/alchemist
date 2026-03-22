import type { TablebaseRecord } from "./tablebase-schema";

/**
 * Curated rows (keyword → `AICandidate`). Default empty.
 *
 * To add entries: validate each `paramArray` / state against the offset map + `tools/validate-offsets.py`
 * on a real Serum `.fxp` before merging. Unvalidated vectors must not be presented as production truth.
 */
export const TABLEBASE_RECORDS: readonly TablebaseRecord[] = [];
