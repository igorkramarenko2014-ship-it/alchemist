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
import {
  MAGIC,
  SEP,
  decompressCompressed,
  parsePreset,
} from "./lib/serum2-preset-parse.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

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
        "Example: node scripts/analyze-serum2-format.mjs \"tools/808 - Decomposed.SerumPreset\"",
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

  let decompressed;
  try {
    decompressed = await decompressCompressed(compressed);
  } catch (e) {
    console.error(`\nDecompression failed: ${e.message}`);
    process.exit(1);
  }

  console.log("\n--- Decompression (fzstd npm or zstd CLI) ---");
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
