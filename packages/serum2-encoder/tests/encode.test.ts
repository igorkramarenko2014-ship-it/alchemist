import { describe, it, expect } from "vitest";
import { decode } from "@msgpack/msgpack";
import { decompress } from "fzstd";
import { encodeSerum2Preset } from "../src/encode.js";

const SEP = new Uint8Array([0x72, 0x5d, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00]);

function indexOfSubarray(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  const n = needle.length;
  for (let i = from; i <= haystack.length - n; i++) {
    let match = true;
    for (let j = 0; j < n; j++) {
      if (haystack[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

describe("encodeSerum2Preset", () => {
  it("produces a Buffer starting with XferJson and round-trips msgpack tail", async () => {
    const buf = await encodeSerum2Preset({
      presetName: "Test Preset",
      filter: { freq: 0.5, reso: 0.25, drive: 0.1 },
      env0: { attack: 0.01, decay: 0.2, release: 0.3, curve1: 0.4 },
      env1: { release: 0.5, curve1: 0.6 },
    });

    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 8).toString("ascii")).toBe("XferJson");

    const u8 = new Uint8Array(buf);
    const jsonStart = u8.indexOf(0x7b);
    expect(jsonStart).toBeGreaterThan(7);
    const sepIdx = indexOfSubarray(u8, SEP, jsonStart);
    expect(sepIdx).toBeGreaterThan(jsonStart);
    const jsonSlice = buf.subarray(jsonStart, sepIdx);
    const meta = JSON.parse(jsonSlice.toString("utf8")) as { fileType: string; presetName: string };
    expect(meta.fileType).toBe("SerumPreset");
    expect(meta.presetName).toBe("Test Preset");

    const compressed = buf.subarray(sepIdx + SEP.length);
    const decompressed = decompress(compressed);
    const map = decode(decompressed) as Record<string, unknown>;
    expect(map).toHaveProperty("Env0");
    expect(map).toHaveProperty("Filter");
  });
});
