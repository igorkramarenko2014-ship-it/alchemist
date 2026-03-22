#!/usr/bin/env python3
"""
Test FXP purity from outside the repo: validate a .fxp against the offset map,
and optionally run a roundtrip (encode minimal FxCk then decode and assert).

Run from anywhere, e.g.:
  python3 test-purity-external.py --fxp /path/to/serum_init.fxp --map /path/to/serum_offset_map_sourced.json
  python3 test-purity-external.py --fxp ./sample.fxp --roundtrip
  python3 test-purity-external.py --fxp ./sample.fxp --map ./map.json --roundtrip --quiet
"""
from __future__ import annotations

import argparse
import json
import struct
import sys
from pathlib import Path

# Embedded map (same as serum_offset_map_sourced.json) so script can run without --map
EMBEDDED_MAP = {
    "header": [
        {"name": "chunkMagic", "offset_hex": "0x00", "type": "str4", "expected": "CcnK"},
        {"name": "firstChunkByteSize", "offset_hex": "0x04", "type": "uint32_be", "min": 0, "max": 2147483647},
        {"name": "fxMagic", "offset_hex": "0x08", "type": "str4", "expected_set": ["FxCk", "FPCh"]},
        {"name": "version", "offset_hex": "0x0C", "type": "uint32_be", "min": 0, "max": 2},
        {"name": "idUint", "offset_hex": "0x10", "type": "uint32_be"},
        {"name": "fxVersion", "offset_hex": "0x14", "type": "uint32_be"},
        {"name": "count", "offset_hex": "0x18", "type": "uint32_be"},
        {"name": "programName", "offset_hex": "0x1C", "type": "str28"},
    ],
    "FxCk_params_start_hex": "0x38",
    "FxCk_param_size_bytes": 4,
    "FPCh_byteSize_hex": "0x38",
    "FPCh_chunk_start_hex": "0x3C",
}

SERUM_ID = 0x5365726D
HEADER_SIZE = 0x38
PROGRAM_NAME_LEN = 28


def parse_hex(s: str) -> int:
    return int(s, 16)


def read_u32_be(data: bytes, offset: int) -> int:
    return struct.unpack_from(">I", data, offset)[0]


def read_f32_be(data: bytes, offset: int) -> float:
    return struct.unpack_from(">f", data, offset)[0]


def read_str(data: bytes, offset: int, length: int) -> str:
    return data[offset : offset + length].split(b"\x00")[0].decode("utf-8", errors="replace")


def load_map(path: Path | None) -> dict:
    if path is not None and path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return EMBEDDED_MAP


def validate_fxp(data: bytes, m: dict, quiet: bool) -> list[str]:
    mismatches: list[str] = []
    if len(data) < HEADER_SIZE:
        return [f"file too short ({len(data)} bytes)"]
    for entry in m["header"]:
        name = entry["name"]
        off = parse_hex(entry["offset_hex"])
        typ = entry.get("type", "")
        if typ == "str4":
            val = read_str(data, off, 4)
            if not quiet:
                print(f"  {entry['offset_hex']}  {name}: {val!r}")
            expected = entry.get("expected")
            expected_set = entry.get("expected_set")
            if expected is not None and val != expected:
                mismatches.append(f"{name}: got {val!r}, expected {expected!r}")
            if expected_set is not None and val not in expected_set:
                mismatches.append(f"{name}: got {val!r}, expected one of {expected_set}")
        elif typ == "uint32_be":
            val = read_u32_be(data, off)
            if not quiet:
                print(f"  {entry['offset_hex']}  {name}: {val}")
            lo, hi = entry.get("min"), entry.get("max")
            if lo is not None and val < lo:
                mismatches.append(f"{name}: {val} < min {lo}")
            if hi is not None and val > hi:
                mismatches.append(f"{name}: {val} > max {hi}")
    fx_magic = read_str(data, 0x08, 4)
    if fx_magic == "FxCk":
        count = read_u32_be(data, 0x18)
        params_start = parse_hex(m["FxCk_params_start_hex"])
        param_size = m["FxCk_param_size_bytes"]
        for i in range(count):
            off = params_start + i * param_size
            if off + param_size > len(data):
                mismatches.append(f"param[{i}] offset out of file")
                break
            val = read_f32_be(data, off)
            if not quiet:
                print(f"  0x{off:04X}  param[{i}]: {val:.6f}")
            if not (0.0 <= val <= 1.0):
                mismatches.append(f"param[{i}] value {val} outside [0,1]")
    elif fx_magic != "FPCh":
        mismatches.append(f"Unknown fxMagic: {fx_magic!r}")
    return mismatches


def encode_fxck_minimal(params: list[float], program_name: str) -> bytes:
    """Build minimal FxCk bytes (same layout as serum-offset-map / Rust). Purity: no I/O, deterministic."""
    count = len(params)
    chunk_byte_size = count * 4
    buf = bytearray(HEADER_SIZE + chunk_byte_size)
    # 0x00 CcnK
    buf[0:4] = b"CcnK"
    # 0x04 chunk size (big-endian u32)
    struct.pack_into(">I", buf, 0x04, chunk_byte_size)
    # 0x08 FxCk
    buf[0x08:0x0C] = b"FxCk"
    struct.pack_into(">I", buf, 0x0C, 1)
    struct.pack_into(">I", buf, 0x10, SERUM_ID)
    struct.pack_into(">I", buf, 0x14, 1)
    struct.pack_into(">I", buf, 0x18, count)
    name_bytes = program_name.encode("utf-8")[:PROGRAM_NAME_LEN - 1].ljust(PROGRAM_NAME_LEN, b"\x00")
    buf[0x1C : 0x1C + PROGRAM_NAME_LEN] = name_bytes
    for i, p in enumerate(params):
        struct.pack_into(">f", buf, HEADER_SIZE + i * 4, p)
    return bytes(buf)


def roundtrip_test(m: dict, quiet: bool) -> list[str]:
    """Encode minimal FxCk then decode; assert values match. Proves layout purity."""
    params_in = [0.0, 0.5]
    name = "PurityTest"
    data = encode_fxck_minimal(params_in, name)
    errs = validate_fxp(data, m, quiet=True)
    if errs:
        return ["roundtrip validate: " + "; ".join(errs)]
    count = read_u32_be(data, 0x18)
    params_start = parse_hex(m["FxCk_params_start_hex"])
    params_out = [read_f32_be(data, params_start + i * 4) for i in range(count)]
    name_out = read_str(data, 0x1C, PROGRAM_NAME_LEN).rstrip("\x00")
    if params_out != params_in:
        return [f"roundtrip params: got {params_out}, expected {params_in}"]
    if name_out != name:
        return [f"roundtrip name: got {name_out!r}, expected {name!r}"]
    if not quiet:
        print("  Roundtrip: encode -> validate -> read: params and name match.")
    return []


def main() -> int:
    ap = argparse.ArgumentParser(description="Test FXP purity (validate + optional roundtrip) from outside repo")
    ap.add_argument("--fxp", type=Path, help="Path to .fxp file (required for validate)")
    ap.add_argument("--map", type=Path, default=None, help="Path to offset map JSON (default: embedded)")
    ap.add_argument("--roundtrip", action="store_true", help="Also run encode->decode roundtrip test")
    ap.add_argument("--quiet", "-q", action="store_true", help="Only exit code and one-line result")
    args = ap.parse_args()

    m = load_map(args.map)
    all_errors: list[str] = []

    if args.fxp is not None:
        if not args.fxp.exists():
            print(f"Error: file not found: {args.fxp}", file=sys.stderr)
            return 1
        data = args.fxp.read_bytes()
        if not args.quiet:
            print("=== Validate .fxp against map ===\n")
        errs = validate_fxp(data, m, args.quiet)
        all_errors.extend(errs)
        if not args.quiet:
            print()
    else:
        if not args.roundtrip:
            print("Error: pass --fxp and/or --roundtrip", file=sys.stderr)
            return 1

    if args.roundtrip:
        if not args.quiet:
            print("=== Roundtrip (encode minimal FxCk -> validate -> read) ===\n")
        errs = roundtrip_test(m, args.quiet)
        all_errors.extend(errs)

    if all_errors:
        if args.quiet:
            print("FAIL: " + "; ".join(all_errors))
        else:
            print("=== Result: FAIL ===")
            for e in all_errors:
                print(f"  {e}")
        return 1
    if args.quiet:
        print("OK")
    else:
        print("=== Result: OK (purity check passed) ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
