import { describe, expect, it } from "vitest";
import {
  SERUM2_CBOR_MAP,
  SERUM2_MOD_MATRIX_SLOT_COUNT,
  getModuleMapping,
  serum2ModMatrixEntryKey,
} from "../src/serum2-cbor-map.js";

describe("serum2-cbor-map (mod matrix placeholders)", () => {
  it("exposes ModMatrixEntry0..31 shells only", () => {
    expect(Object.keys(SERUM2_CBOR_MAP).length).toBe(SERUM2_MOD_MATRIX_SLOT_COUNT);
    expect(SERUM2_CBOR_MAP["ModMatrixEntry0"]?.section).toBe("Mod Matrix");
    expect(SERUM2_CBOR_MAP["ModMatrixEntry31"]?.kind).toBe("object");
  });

  it("serum2ModMatrixEntryKey bounds", () => {
    expect(serum2ModMatrixEntryKey(0)).toBe("ModMatrixEntry0");
    expect(serum2ModMatrixEntryKey(31)).toBe("ModMatrixEntry31");
    expect(serum2ModMatrixEntryKey(-1)).toBeNull();
    expect(serum2ModMatrixEntryKey(32)).toBeNull();
    expect(serum2ModMatrixEntryKey(1.5)).toBeNull();
  });

  it("getModuleMapping('ModMatrixEntry') returns all slots", () => {
    const m = getModuleMapping("ModMatrixEntry");
    expect(Object.keys(m).length).toBe(32);
    expect(m["ModMatrixEntry0"]).toBeDefined();
  });
});
