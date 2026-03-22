//! Auto-generated from tools/serum_offset_map_sourced.json. Do not edit by hand.
//! Run: python3 tools/generate-rust-map.py

pub const HEADER_CHUNK_MAGIC: &[u8; 4] = b"CcnK";
pub const FX_MAGIC_FXCK: &[u8; 4] = b"FxCk";
pub const FX_MAGIC_FPCH: &[u8; 4] = b"FPCh";
pub const PROGRAM_NAME_LEN: usize = 28;
pub const SERUM_PLUGIN_ID: u32 = 0x5365726D;

// Header offsets (from JSON header array)
pub const HEADER_FIRST_CHUNK_BYTE_SIZE_OFFSET: u32 = 0x04;
pub const HEADER_FX_MAGIC_OFFSET: u32 = 0x08;
pub const HEADER_VERSION_OFFSET: u32 = 0x0c;
pub const HEADER_ID_UINT_OFFSET: u32 = 0x10;
pub const HEADER_FX_VERSION_OFFSET: u32 = 0x14;
pub const HEADER_COUNT_OFFSET: u32 = 0x18;
pub const HEADER_PROGRAM_NAME_OFFSET: u32 = 0x1c;

// FxCk (parameter array)
pub const FXCK_PARAMS_START: u32 = 0x38;
pub const FXCK_PARAM_SIZE_BYTES: u32 = 4;

// FPCh (opaque chunk)
pub const FPCH_BYTE_SIZE_OFFSET: u32 = 0x38;
pub const FPCH_CHUNK_START: u32 = 0x3c;
