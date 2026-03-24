/**
 * Shared `.SerumPreset` parse: `XferJson` + JSON slice + `r]` separator + zstd blob.
 * @see scripts/analyze-serum2-format.mjs · packages/serum2-encoder encode path
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(__dirname, "..", "..");

const fzstdEntry = join(
  repoRoot,
  "packages",
  "shared-engine",
  "node_modules",
  "fzstd",
  "esm",
  "index.mjs",
);

export async function loadFzstdDecompress() {
  if (!existsSync(fzstdEntry)) {
    throw new Error(
      `fzstd not found at ${fzstdEntry}. Run: pnpm add fzstd --filter @alchemist/shared-engine`,
    );
  }
  const mod = await import(fzstdEntry);
  return mod.decompress;
}

export const MAGIC = new Uint8Array(Buffer.from("XferJson", "ascii"));
/** Binary marker after JSON: ASCII `r]` + 0x00 0x00 0x02 0x00 0x00 0x00 */
export const SEP = new Uint8Array([0x72, 0x5d, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00]);

export function indexOfSubarray(haystack, needle, from = 0) {
  const n = needle.length;
  if (n === 0) return from;
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

export function parsePreset(buf) {
  const u8 = new Uint8Array(buf);
  if (u8.length < MAGIC.length + SEP.length + 2) {
    throw new Error("File too small for XferJson + JSON + separator");
  }
  for (let i = 0; i < MAGIC.length; i++) {
    if (u8[i] !== MAGIC[i]) {
      throw new Error(
        `Magic mismatch at 0: expected XferJson, got ${Buffer.from(u8.subarray(0, 12)).toString("hex")}`,
      );
    }
  }
  const searchFrom = MAGIC.length;
  let jsonStart = -1;
  for (let i = searchFrom; i < u8.length; i++) {
    if (u8[i] === 0x7b) {
      jsonStart = i;
      break;
    }
  }
  if (jsonStart < 0) {
    throw new Error(`No JSON object start '{' after offset ${searchFrom}`);
  }
  const sepIdx = indexOfSubarray(u8, SEP, jsonStart);
  if (sepIdx < 0) {
    throw new Error(
      `Separator (r] + 00 00 02 00 00 00) not found after JSON start (offset ${jsonStart})`,
    );
  }
  const jsonBytes = u8.subarray(jsonStart, sepIdx);
  if (jsonBytes.length === 0 || jsonBytes[jsonBytes.length - 1] !== 0x7d) {
    throw new Error(
      `JSON slice does not end with '}' (len=${jsonBytes.length}, last byte 0x${jsonBytes.at(-1)?.toString(16) ?? ""})`,
    );
  }
  const compressedOffset = sepIdx + SEP.length;
  const compressed = u8.subarray(compressedOffset);
  return {
    jsonBytes,
    jsonLen: jsonBytes.length,
    jsonStart,
    compressed,
    compressedOffset,
    headerThroughJson: compressedOffset - SEP.length,
  };
}

function tryZstdCli(compressed) {
  const r = spawnSync("zstd", ["-d", "-c"], {
    input: Buffer.from(compressed),
    maxBuffer: 256 * 1024 * 1024,
    encoding: "buffer",
  });
  if (r.error || r.status !== 0) return null;
  return new Uint8Array(r.stdout);
}

/**
 * @returns {Promise<Uint8Array>}
 */
export async function decompressCompressed(compressed) {
  const decompress = await loadFzstdDecompress();
  try {
    return decompress(compressed);
  } catch (e) {
    const cli = tryZstdCli(compressed);
    if (cli) return cli;
    throw e;
  }
}
