#!/usr/bin/env node
/**
 * Research: Serum 2 `.SerumPreset` layout:
 *   `XferJson` (8) + preamble (variable; may include a misleading u32) + UTF-8 JSON +
 *   separator `r]` + 00 00 02 00 00 00 (8) + zstd payload.
 *
 * Usage: node scripts/analyze-serum2-format.mjs [<path-to-file.SerumPreset>]
 * With no path, uses the first `tools/*.SerumPreset` (lexicographic).
 *
 * Depends on `fzstd` from `@alchemist/shared-engine` (pnpm workspace).
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const fzstdEntry = join(
  repoRoot,
  "packages",
  "shared-engine",
  "node_modules",
  "fzstd",
  "esm",
  "index.mjs"
);

async function loadDecompress() {
  if (!existsSync(fzstdEntry)) {
    throw new Error(
      `fzstd not found at ${fzstdEntry}. Run: pnpm add fzstd --filter @alchemist/shared-engine`
    );
  }
  const mod = await import(fzstdEntry);
  return mod.decompress;
}

const MAGIC = new Uint8Array(Buffer.from("XferJson", "ascii"));
/** Binary marker after JSON: ASCII `r]` + 0x00 0x00 0x02 0x00 0x00 0x00 */
const SEP = new Uint8Array([0x72, 0x5d, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00]);
function indexOfSubarray(haystack, needle, from = 0) {
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

function hexPreview(u8, maxBytes = 256) {
  const n = Math.min(u8.length, maxBytes);
  const lines = [];
  for (let i = 0; i < n; i += 16) {
    const chunk = u8.subarray(i, Math.min(i + 16, n));
    const hex = [...chunk].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const ascii = [...chunk]
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
      .join("");
    lines.push(`${i.toString(16).padStart(6, "0")}  ${hex.padEnd(48, " ")}  ${ascii}`);
  }
  if (u8.length > maxBytes) lines.push(`... (${u8.length - maxBytes} more bytes)`);
  return lines.join("\n");
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

function parsePreset(buf) {
  const u8 = new Uint8Array(buf);
  if (u8.length < MAGIC.length + SEP.length + 2) {
    throw new Error("File too small for XferJson + JSON + separator");
  }
  for (let i = 0; i < MAGIC.length; i++) {
    if (u8[i] !== MAGIC[i]) {
      throw new Error(
        `Magic mismatch at 0: expected XferJson, got ${Buffer.from(u8.subarray(0, 12)).toString("hex")}`
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
      `Separator (r] + 00 00 02 00 00 00) not found after JSON start (offset ${jsonStart})`
    );
  }
  const jsonBytes = u8.subarray(jsonStart, sepIdx);
  if (jsonBytes.length === 0 || jsonBytes[jsonBytes.length - 1] !== 0x7d) {
    throw new Error(
      `JSON slice does not end with '}' (len=${jsonBytes.length}, last byte 0x${jsonBytes.at(-1)?.toString(16) ?? ""})`
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

function resolveDefaultSerumPresetPath() {
  const toolsDir = join(repoRoot, "tools");
  if (!existsSync(toolsDir)) return null;
  const names = readdirSync(toolsDir).filter((n) => n.toLowerCase().endsWith(".serumpreset"));
  if (names.length === 0) return null;
  names.sort();
  return join(toolsDir, names[0]);
}

async function main() {
  let filePath = process.argv[2];
  if (!filePath) {
    filePath = resolveDefaultSerumPresetPath();
    if (filePath) {
      console.log(`No path given; using first tools/*.SerumPreset: ${filePath}\n`);
    }
  }
  if (!filePath) {
    console.error(
      "Usage: node scripts/analyze-serum2-format.mjs <path-to-file.SerumPreset>\n" +
        "Or place a .SerumPreset in tools/ (uses first match lexicographically).\n" +
        "Example: node scripts/analyze-serum2-format.mjs \"tools/808 - Decomposed.SerumPreset\""
    );
    process.exit(1);
  }
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const raw = readFileSync(filePath);
  const totalSize = raw.length;
  console.log("=== Serum 2 .SerumPreset analysis ===\n");
  console.log(`Path: ${filePath}`);
  console.log(`Total size: ${totalSize} bytes\n`);

  let parsed;
  try {
    parsed = parsePreset(raw);
  } catch (e) {
    console.error("Parse error:", e.message);
    process.exit(1);
  }

  const { jsonBytes, jsonLen, compressed, compressedOffset } = parsed;
  const metaStr = Buffer.from(jsonBytes).toString("utf8");
  let metaObj = null;
  try {
    metaObj = JSON.parse(metaStr);
  } catch {
    /* handled below */
  }

  console.log("--- JSON metadata (raw) ---");
  console.log(metaStr.slice(0, 4000) + (metaStr.length > 4000 ? "\n... [truncated]" : ""));
  console.log("\n--- JSON metadata (parsed) ---");
  if (metaObj) {
    console.log(JSON.stringify(metaObj, null, 2));
  } else {
    console.log("(not valid JSON — see raw above)");
  }

  console.log("\n--- Section sizes ---");
  console.log(`Magic "XferJson": ${MAGIC.length} bytes`);
  console.log(`Preamble (before first '{'): ${parsed.jsonStart - MAGIC.length} bytes`);
  console.log(`JSON body: ${jsonLen} bytes (starts at offset ${parsed.jsonStart})`);
  console.log(`Separator: ${SEP.length} bytes`);
  console.log(`Compressed blob: ${compressed.length} bytes (starts at offset ${compressedOffset})`);

  const ratioLine = (decLen) =>
    `Blob vs file: ${(compressed.length / totalSize).toFixed(4)}; compressed/decompressed: ${(compressed.length / decLen).toFixed(4)}`;

  const decompress = await loadDecompress();
  let decompressed;
  let method = "fzstd (npm)";
  try {
    decompressed = decompress(compressed);
  } catch (e) {
    console.warn(`\nfzstd decompress failed: ${e.message}`);
    const cli = tryZstdCli(compressed);
    if (cli) {
      decompressed = cli;
      method = "zstd CLI (fallback)";
    } else {
      console.error("zstd CLI fallback also failed (is `zstd` on PATH?).");
      process.exit(1);
    }
  }

  console.log(`\n--- Decompression (${method}) ---`);
  console.log(`Decompressed size: ${decompressed.length} bytes`);
  console.log(ratioLine(decompressed.length));

  console.log("\n--- Decompressed hex preview (first 512 bytes) ---");
  console.log(hexPreview(decompressed, 512));

  const asUtf8 = Buffer.from(decompressed).toString("utf8");
  console.log("\n--- Decompressed as UTF-8 (first 2000 chars) ---");
  console.log(asUtf8.slice(0, 2000) + (asUtf8.length > 2000 ? "\n... [truncated]" : ""));

  console.log("\n--- JSON parse attempt on full decompressed buffer (UTF-8) ---");
  try {
    const j = JSON.parse(asUtf8);
    console.log(JSON.stringify(j, null, 2).slice(0, 8000));
    if (JSON.stringify(j).length > 8000) console.log("\n... [truncated]");
  } catch (err) {
    console.log(`Not JSON: ${err.message}`);
  }

  console.log("\n=== Done ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
