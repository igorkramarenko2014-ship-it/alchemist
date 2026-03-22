/**
 * Serum (VST2) FXP offset map — auto-generated from tools/serum_offset_map_sourced.json.
 * Do not edit by hand. Run: python3 tools/generate-ts-map.py
 * Validated via: python tools/validate-offsets.py <path-to-Serum-init.fxp>
 * Ref: vst2-preset-parser (CharlesHolbrow), Steinberg Vst2xProgram.
 */

// ─── Header (0x00–0x37) ─────────────────────────────────────────────────────
export const HEADER_CHUNK_MAGIC_OFFSET = 0x00;
export const HEADER_FIRST_CHUNK_BYTE_SIZE_OFFSET = 0x04;
export const HEADER_FX_MAGIC_OFFSET = 0x08;
export const HEADER_VERSION_OFFSET = 0x0c;
export const HEADER_ID_UINT_OFFSET = 0x10;
export const HEADER_FX_VERSION_OFFSET = 0x14;
export const HEADER_COUNT_OFFSET = 0x18;
export const HEADER_PROGRAM_NAME_OFFSET = 0x1c;

export const HEADER_CHUNK_MAGIC = "CcnK" as const;
export const FX_MAGIC_FXCK = "FxCk" as const;
export const FX_MAGIC_FPCH = "FPCh" as const;
export const SERUM_PLUGIN_ID = 0x5365726d;

// ─── FxCk (parameter array) ─────────────────────────────────────────────────
/** Start of float32 BE parameter array. */
export const FXCK_PARAMS_START = 0x38;
/** Size in bytes of each parameter (float32). */
export const FXCK_PARAM_SIZE_BYTES = 4;

// ─── FPCh (opaque chunk) ────────────────────────────────────────────────────
/** Offset in header where FPCh chunk byte size is stored (same as header size). */
export const FPCH_BYTE_SIZE_OFFSET = 0x38;
/** Start of FPCh chunk payload (after 0x38-byte header). */
export const FPCH_CHUNK_START = 0x3c;
