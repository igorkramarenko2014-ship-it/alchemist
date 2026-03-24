/**
 * **Scaffold only** — not authoritative, not part of Serum 1 HARD GATE.
 *
 * Community unpackers produce JSON with `kParam*` / `kUIParam*` keys under module buckets (`Env0`, `LFO0`, …).
 * Host-visible **VST3 parameter names** (e.g. from DAW automation lists) are a useful cross-reference but
 * **not** a guaranteed 1:1 map to inner preset keys without diff + audition per Serum 2 version.
 *
 * Fill `serum2ParamCatalog` via: unpack many factory presets → diff JSON → correlate with VST3 lists →
 * mark `source` and keep notes honest. **Do not** treat guessed ranges as gates until validated.
 *
 * For a typed **Record** + helpers (`getCborMapping`, …), see **`serum2-cbor-map.ts`** (also starts empty).
 */
export type Serum2ParamCatalogSource =
  | "community_vst3_list"
  | "preset_unpack_diff"
  | "heuristic";

export interface Serum2ParamCatalogEntry {
  /** Inner key (e.g. `kParamCurve1`) or VST3-style slug where that is the join key. */
  key: string;
  source: Serum2ParamCatalogSource;
  /** UI / section hint only. */
  description?: string;
  /** Observed behavior, version notes, or “unknown”. */
  notes?: string;
}

/** Start empty; add entries only with traceable provenance. */
export const serum2ParamCatalog: readonly Serum2ParamCatalogEntry[] = [];
