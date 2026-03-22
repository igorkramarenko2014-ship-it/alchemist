#!/usr/bin/env python3
"""
Validate a Serum (VST2) init preset .fxp against the sourced offset map.
Usage: python tools/validate-offsets.py <path-to-init.fxp>
Dumps every byte offset and value; flags mismatches.
Sources: vst2-preset-parser (CharlesHolbrow), Steinberg Vst2xProgram.
"""
from __future__ import annotations

import argparse
import json
import struct
import sys
from pathlib import Path


def load_sourced_map(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def parse_hex(s: str) -> int:
    return int(s, 16)


def read_u32_be(data: bytes, offset: int) -> int:
    return struct.unpack_from(">I", data, offset)[0]


def read_f32_be(data: bytes, offset: int) -> float:
    return struct.unpack_from(">f", data, offset)[0]


def read_str(data: bytes, offset: int, length: int) -> str:
    return data[offset : offset + length].split(b"\x00")[0].decode("utf-8", errors="replace")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Serum .fxp against sourced offset map")
    parser.add_argument("fxp_path", type=Path, help="Path to Serum init preset .fxp")
    parser.add_argument(
        "--map",
        type=Path,
        default=Path(__file__).resolve().parent / "serum_offset_map_sourced.json",
        help="Path to sourced offset map JSON",
    )
    parser.add_argument("--dump-all", action="store_true", help="Dump every byte (hex) for first 256 bytes")
    args = parser.parse_args()

    if not args.fxp_path.exists():
        print(f"Error: file not found: {args.fxp_path}", file=sys.stderr)
        return 1

    data = args.fxp_path.read_bytes()
    if len(data) < 0x38:
        print(f"Error: file too short ({len(data)} bytes)", file=sys.stderr)
        return 1

    try:
        m = load_sourced_map(args.map)
    except Exception as e:
        print(f"Error loading map: {e}", file=sys.stderr)
        return 1

    mismatches: list[str] = []
    header_spec = m["header"]

    # --- Dump header fields and validate ---
    print("=== Header dump (sourced map) ===\n")
    for entry in header_spec:
        name = entry["name"]
        off = parse_hex(entry["offset_hex"])
        typ = entry.get("type", "")
        units = entry.get("units", "")

        if typ == "str4":
            val = read_str(data, off, 4)
            raw = data[off : off + 4].hex()
            print(f"  {entry['offset_hex']}  {name}: {val!r}  (raw: {raw})  {units}")
            expected = entry.get("expected")
            expected_set = entry.get("expected_set")
            if expected is not None and val != expected:
                mismatches.append(f"{name}: got {val!r}, expected {expected!r}")
            if expected_set is not None and val not in expected_set:
                mismatches.append(f"{name}: got {val!r}, expected one of {expected_set}")
        elif typ == "str28":
            val = read_str(data, off, 28)
            print(f"  {entry['offset_hex']}  {name}: {val!r}  {units}")
        elif typ == "uint32_be":
            val = read_u32_be(data, off)
            print(f"  {entry['offset_hex']}  {name}: {val}  (0x{val:08X})  {units}")
            lo, hi = entry.get("min"), entry.get("max")
            if lo is not None and val < lo:
                mismatches.append(f"{name}: {val} < min {lo}")
            if hi is not None and val > hi:
                mismatches.append(f"{name}: {val} > max {hi}")
        else:
            print(f"  {entry['offset_hex']}  {name}: (type {typ} not dumped)")

    # --- Branch on FxCk vs FPCh ---
    fx_magic = read_str(data, 0x08, 4)
    count = read_u32_be(data, 0x18)
    params_start = parse_hex(m["FxCk_params_start_hex"])
    param_size = m["FxCk_param_size_bytes"]
    fpch_byte_size_off = parse_hex(m["FPCh_byteSize_hex"])
    fpch_chunk_start = parse_hex(m["FPCh_chunk_start_hex"])

    if fx_magic == "FxCk":
        print("\n=== FxCk: parameter array (float32 BE) ===\n")
        for i in range(count):
            off = params_start + i * param_size
            if off + param_size > len(data):
                mismatches.append(f"param[{i}] offset 0x{off:X} out of file")
                break
            val = read_f32_be(data, off)
            print(f"  0x{off:04X}  param[{i}]: {val:.6f}")
            if not (0.0 <= val <= 1.0):
                mismatches.append(f"param[{i}] value {val} outside [0,1]")
    elif fx_magic == "FPCh":
        byte_size = read_u32_be(data, fpch_byte_size_off)
        chunk_start = fpch_chunk_start
        chunk_end = chunk_start + byte_size
        print(f"\n=== FPCh: chunk byteSize at 0x{fpch_byte_size_off:X} = {byte_size}, chunk 0x{chunk_start:X}..0x{chunk_end:X} ===\n")
        if chunk_end > len(data):
            mismatches.append(f"Chunk end 0x{chunk_end:X} exceeds file size {len(data)}")
        else:
            chunk = data[chunk_start:chunk_end]
            magic_in_chunk = chunk[:4].decode("ascii", errors="replace") if len(chunk) >= 4 else ""
            print(f"  Chunk first 4 bytes: {chunk[:4].hex()}  ({magic_in_chunk!r})")
            print(f"  Dump first 64 bytes of chunk (hex):")
            for j in range(0, min(64, len(chunk)), 16):
                line = "  ".join(f"{chunk[j+k]:02X}" for k in range(min(16, len(chunk) - j)))
                print(f"    0x{chunk_start+j:04X}  {line}")
    else:
        mismatches.append(f"Unknown fxMagic: {fx_magic!r}")

    if args.dump_all:
        print("\n=== Raw first 256 bytes (hex) ===\n")
        for i in range(0, min(256, len(data)), 16):
            line = "  ".join(f"{data[i+k]:02X}" for k in range(min(16, len(data) - i)))
            print(f"  0x{i:04X}  {line}")

    # --- Report ---
    print("\n=== Validation result ===")
    if mismatches:
        for msg in mismatches:
            print(f"  MISMATCH: {msg}")
        return 1
    print("  OK: no mismatches.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
