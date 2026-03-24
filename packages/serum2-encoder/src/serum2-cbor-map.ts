/**
 * **Types + empty registry** for Serum 2 preset keys (unpacked JSON / inner binary keys).
 *
 * **Not** Serum 1 HARD GATE. **Do not** ship guessed `range` / `defaultValue` from community VST3 lists
 * as facts — add entries only after preset diff + Serum 2 audition (see `serum2-param-catalog.stub.ts`).
 *
 * Inner payload in this package is **MessagePack + zstd** (`encode.ts`); community docs often say “CBOR”
 * for the same conceptual layer — verify per file.
 */
export type Serum2CborKey = string;

export type Serum2CborValueKind =
  | "float"
  | "int"
  | "bool"
  | "enum"
  | "object"
  | "array"
  | "default sentinel";

export interface Serum2CborMappingEntry {
  uiControl: string;
  section: string;
  kind: Serum2CborValueKind;
  /** Observed or documented default; `undefined` until validated. */
  defaultValue?: unknown;
  /** Inclusive numeric range when known; omit if unknown. */
  range?: readonly [number, number];
  description?: string;
  /** Host automation label cross-ref — heuristic until proven against unpack keys. */
  vst3ParamName?: string;
}

/** Count of indexed `ModMatrixEntry{N}` placeholders below (community unpack pattern — not Xfer-official). */
export const SERUM2_MOD_MATRIX_SLOT_COUNT = 32;

/** `ModMatrixEntry7` etc.; returns `null` if out of `[0, SERUM2_MOD_MATRIX_SLOT_COUNT)`. */
export function serum2ModMatrixEntryKey(slotIndex: number): string | null {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= SERUM2_MOD_MATRIX_SLOT_COUNT)
    return null;
  return `ModMatrixEntry${slotIndex}`;
}

function buildModMatrixEntryPlaceholders(): Record<string, Serum2CborMappingEntry> {
  const out: Record<string, Serum2CborMappingEntry> = {};
  for (let i = 0; i < SERUM2_MOD_MATRIX_SLOT_COUNT; i++) {
    out[`ModMatrixEntry${i}`] = {
      uiControl: `Mod matrix slot ${i + 1}`,
      section: "Mod Matrix",
      kind: "object",
      description:
        "Observed module bucket in unpacked `.SerumPreset` JSON — inner `plainParams` / curve keys are **not** listed here. Add `kParam*` entries only after diff + Serum 2 audition; do not copy VST3 names as facts.",
    };
  }
  return out;
}

/**
 * Structural placeholders for `ModMatrixEntry*` only. No inner `kParamMod*` map — those names/ranges are
 * unverified in-tree and would mislead gates if added heuristically.
 */
export const SERUM2_CBOR_MAP: Readonly<Record<Serum2CborKey, Serum2CborMappingEntry>> = Object.freeze(
  buildModMatrixEntryPlaceholders(),
);

export function getCborMapping(key: Serum2CborKey): Serum2CborMappingEntry | undefined {
  return SERUM2_CBOR_MAP[key];
}

/**
 * Keys of `SERUM2_CBOR_MAP` that match `moduleKey`, dot-children (`Env0.foo`), or all `ModMatrixEntry{n}`
 * when `moduleKey === "ModMatrixEntry"`.
 */
export function getModuleMapping(moduleKey: string): Record<string, Serum2CborMappingEntry> {
  const out: Record<string, Serum2CborMappingEntry> = {};
  const modMatrixFamily = moduleKey === "ModMatrixEntry";
  for (const k of Object.keys(SERUM2_CBOR_MAP)) {
    const isModSlot = modMatrixFamily && /^ModMatrixEntry[0-9]+$/.test(k);
    if (k === moduleKey || k.startsWith(`${moduleKey}.`) || isModSlot) {
      const e = SERUM2_CBOR_MAP[k];
      if (e) out[k] = e;
    }
  }
  return out;
}

/**
 * When **no** mapping exists, returns **true** (unknown keys pass). Use a stricter outer gate if needed.
 */
export function isValidCborValue(key: Serum2CborKey, value: unknown): boolean {
  const m = getCborMapping(key);
  if (!m?.range) return true;
  const [lo, hi] = m.range;
  if (m.kind === "float" && typeof value === "number")
    return value >= lo && value <= hi;
  if (m.kind === "int" && typeof value === "number" && Number.isInteger(value))
    return value >= lo && value <= hi;
  return true;
}
