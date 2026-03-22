"use strict";

const fs = require("fs");
const path = require("path");

const PKG_ROOT = path.resolve(__dirname, "..");
const TS_MAP_PATH = path.join(PKG_ROOT, "serum-offset-map.ts");
const PYTHON_SCRIPT_PATH = path.resolve(__dirname, "../../../tools/test-purity-external.py");

function parseHex(val) {
  const n = typeof val === "string" ? parseInt(val, 16) : val;
  return "0x" + n.toString(16).toUpperCase().padStart(2, "0");
}

function extractConstants(tsContent) {
  const out = {};
  const regex = /(\w+)\s*=\s*(0x[0-9a-fA-F]+|\d+)/g;
  let m;
  while ((m = regex.exec(tsContent)) !== null) {
    const name = m[1];
    const val = m[2].toLowerCase().startsWith("0x") ? parseInt(m[2], 16) : parseInt(m[2], 10);
    out[name] = val;
  }
  return out;
}

function syncToPython() {
  if (!fs.existsSync(TS_MAP_PATH)) {
    console.error("❌ serum-offset-map.ts not found at", TS_MAP_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(PYTHON_SCRIPT_PATH)) {
    console.error("❌ Python script not found at", PYTHON_SCRIPT_PATH);
    process.exit(1);
  }

  const tsContent = fs.readFileSync(TS_MAP_PATH, "utf8");
  const o = extractConstants(tsContent);

  const newMapContent = `EMBEDDED_MAP = {
    "header": [
        {"name": "chunkMagic", "offset_hex": "${parseHex(o.HEADER_CHUNK_MAGIC_OFFSET)}", "type": "str4", "expected": "CcnK"},
        {"name": "firstChunkByteSize", "offset_hex": "${parseHex(o.HEADER_FIRST_CHUNK_BYTE_SIZE_OFFSET)}", "type": "uint32_be", "min": 0, "max": 2147483647},
        {"name": "fxMagic", "offset_hex": "${parseHex(o.HEADER_FX_MAGIC_OFFSET)}", "type": "str4", "expected_set": ["FxCk", "FPCh"]},
        {"name": "version", "offset_hex": "${parseHex(o.HEADER_VERSION_OFFSET)}", "type": "uint32_be", "min": 0, "max": 2},
        {"name": "idUint", "offset_hex": "${parseHex(o.HEADER_ID_UINT_OFFSET)}", "type": "uint32_be"},
        {"name": "fxVersion", "offset_hex": "${parseHex(o.HEADER_FX_VERSION_OFFSET)}", "type": "uint32_be"},
        {"name": "count", "offset_hex": "${parseHex(o.HEADER_COUNT_OFFSET)}", "type": "uint32_be"},
        {"name": "programName", "offset_hex": "${parseHex(o.HEADER_PROGRAM_NAME_OFFSET)}", "type": "str28"},
    ],
    "FxCk_params_start_hex": "${parseHex(o.FXCK_PARAMS_START)}",
    "FxCk_param_size_bytes": ${o.FXCK_PARAM_SIZE_BYTES},
    "FPCh_byteSize_hex": "${parseHex(o.FPCH_BYTE_SIZE_OFFSET)}",
    "FPCh_chunk_start_hex": "${parseHex(o.FPCH_CHUNK_START)}",
}`;

  const pythonContent = fs.readFileSync(PYTHON_SCRIPT_PATH, "utf8");
  const blockStart = pythonContent.indexOf("EMBEDDED_MAP = {");
  const afterBlock = pythonContent.indexOf("\nSERUM_ID", blockStart);
  if (blockStart === -1 || afterBlock === -1) {
    console.error("❌ Could not find EMBEDDED_MAP block in Python script");
    process.exit(1);
  }
  const sliceBeforeMarker = pythonContent.slice(blockStart, afterBlock);
  const lastBraceClose = sliceBeforeMarker.lastIndexOf("\n}\n");
  const blockEnd = blockStart + lastBraceClose;
  const updatedContent =
    pythonContent.slice(0, blockStart) +
    newMapContent +
    "\n" +
    pythonContent.slice(blockEnd + 3);

  fs.writeFileSync(PYTHON_SCRIPT_PATH, updatedContent, "utf8");
  console.log("✅ EMBEDDED_MAP synced from serum-offset-map.ts to test-purity-external.py");
}

syncToPython();
