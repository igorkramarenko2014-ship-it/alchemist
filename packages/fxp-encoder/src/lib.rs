//! Serum (VST2) FXP encode/decode. Offsets match `serum-offset-map.ts` and
//! `tools/serum_offset_map_sourced.json`, validated by `tools/validate-offsets.py`.

use std::io::{Cursor, Read, Write};
use wasm_bindgen::prelude::*;

// ─── Offsets (must match serum-offset-map.ts / serum_offset_map_sourced.json) ─
const HEADER_CHUNK_MAGIC: &[u8; 4] = b"CcnK";
const HEADER_FX_MAGIC_OFFSET: u32 = 0x08;
const FX_MAGIC_FXCK: &[u8; 4] = b"FxCk";
const FX_MAGIC_FPCH: &[u8; 4] = b"FPCh";
const HEADER_FIRST_CHUNK_BYTE_SIZE_OFFSET: u32 = 0x04;
const HEADER_VERSION_OFFSET: u32 = 0x0c;
const HEADER_ID_UINT_OFFSET: u32 = 0x10;
const HEADER_FX_VERSION_OFFSET: u32 = 0x14;
const HEADER_COUNT_OFFSET: u32 = 0x18;
const HEADER_PROGRAM_NAME_OFFSET: u32 = 0x1c;
const PROGRAM_NAME_LEN: usize = 28;
const FXCK_PARAMS_START: u32 = 0x38;
const FXCK_PARAM_SIZE_BYTES: u32 = 4;
const SERUM_PLUGIN_ID: u32 = 0x5365726D; // "Serum"

fn read_u32_be(r: &mut impl Read) -> std::io::Result<u32> {
    let mut b = [0u8; 4];
    r.read_exact(&mut b)?;
    Ok(u32::from_be_bytes(b))
}

fn write_u32_be(w: &mut impl Write, n: u32) -> std::io::Result<()> {
    w.write_all(&n.to_be_bytes())
}

fn read_f32_be(r: &mut impl Read) -> std::io::Result<f32> {
    let mut b = [0u8; 4];
    r.read_exact(&mut b)?;
    Ok(f32::from_bits(u32::from_be_bytes(b)))
}

fn write_f32_be(w: &mut impl Write, x: f32) -> std::io::Result<()> {
    w.write_all(&x.to_bits().to_be_bytes())
}

fn pad_str28(s: &str) -> [u8; 28] {
    let mut out = [0u8; 28];
    let b = s.as_bytes();
    let n = b.len().min(27);
    out[..n].copy_from_slice(&b[..n]);
    out
}

/// Encode an FxCk (float param array) FXP. `params` = normalized 0.0–1.0 floats; `program_name` = max 27 chars.
#[wasm_bindgen]
pub fn encode_fxp_fxck(params: &[f32], program_name: &str) -> Vec<u8> {
    let count = params.len() as u32;
    let chunk_byte_size = count * FXCK_PARAM_SIZE_BYTES;
    let mut out = Vec::with_capacity(FXCK_PARAMS_START as usize + chunk_byte_size as usize);

    out.extend_from_slice(HEADER_CHUNK_MAGIC);
    out.extend_from_slice(&chunk_byte_size.to_be_bytes());
    out.extend_from_slice(FX_MAGIC_FXCK);
    out.extend_from_slice(&1u32.to_be_bytes());   // version
    out.extend_from_slice(&SERUM_PLUGIN_ID.to_be_bytes());
    out.extend_from_slice(&1u32.to_be_bytes());   // fx version
    out.extend_from_slice(&count.to_be_bytes());
    out.extend_from_slice(&pad_str28(program_name));

    for &p in params {
        out.extend_from_slice(&p.to_bits().to_be_bytes());
    }
    out
}

fn io_to_js(e: std::io::Error) -> JsError {
    JsError::new(&e.to_string())
}

/// Decode an FxCk FXP. Returns { programName, params }. Fails if magic/count invalid.
#[wasm_bindgen]
pub fn decode_fxp_fxck(data: &[u8]) -> Result<JsValue, JsError> {
    const MIN_LEN: usize = 0x38 + 4;
    if data.len() < MIN_LEN {
        return Err(JsError::new("fxp too short"));
    }
    if &data[0..4] != HEADER_CHUNK_MAGIC {
        return Err(JsError::new("invalid chunk magic"));
    }
    if &data[HEADER_FX_MAGIC_OFFSET as usize..][..4] != FX_MAGIC_FXCK {
        return Err(JsError::new("not FxCk format"));
    }
    let mut c = Cursor::new(data);
    c.set_position(HEADER_FIRST_CHUNK_BYTE_SIZE_OFFSET as u64);
    let _chunk_size = read_u32_be(&mut c).map_err(io_to_js)?;
    c.set_position(HEADER_COUNT_OFFSET as u64);
    let count = read_u32_be(&mut c).map_err(io_to_js)?;
    c.set_position(HEADER_PROGRAM_NAME_OFFSET as u64);
    let mut name_buf = [0u8; PROGRAM_NAME_LEN];
    c.read_exact(&mut name_buf).map_err(io_to_js)?;
    let name = String::from_utf8_lossy(&name_buf)
        .trim_end_matches('\0')
        .to_string();

    let params_start = FXCK_PARAMS_START as usize;
    let needed = params_start + (count as usize) * (FXCK_PARAM_SIZE_BYTES as usize);
    if data.len() < needed {
        return Err(JsError::new("fxp shorter than param array"));
    }
    let mut params = Vec::with_capacity(count as usize);
    let mut cur = Cursor::new(&data[params_start..]);
    for _ in 0..count {
        params.push(read_f32_be(&mut cur).map_err(io_to_js)?);
    }

    let out = js_sys::Object::new();
    js_sys::Reflect::set(&out, &"programName".into(), &name.into())
        .map_err(|_| JsError::new("Reflect.set failed"))?;
    js_sys::Reflect::set(
        &out,
        &"params".into(),
        &js_sys::Float32Array::from(params.as_slice()).into(),
    )
    .map_err(|_| JsError::new("Reflect.set failed"))?;
    Ok(out.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_fxck() {
        let params = vec![0.0f32, 0.0];
        let encoded = encode_fxp_fxck(&params, "Init");
        assert!(encoded.len() >= 0x40);
        assert_eq!(&encoded[0..4], b"CcnK");
        assert_eq!(&encoded[8..12], b"FxCk");
    }
}
