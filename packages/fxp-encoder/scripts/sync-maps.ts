/**
 * Syncs TS serum-offset-map constants to the Python purity script (EMBEDDED_MAP)
 * so there is a single source of truth. Run: pnpm run sync-maps
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as offsets from "../serum-offset-map";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_SCRIPT_PATH = path.resolve(__dirname, "../../../tools/test-purity-external.py");

function toHex(n: number): string {
  return "0x" + n.toString(16).toUpperCase().padStart(2, "0");
}

function syncToPython(): void {
  if (!fs.existsSync(PYTHON_SCRIPT_PATH)) {
    console.error(`❌ Python script not found at ${PYTHON_SCRIPT_PATH}`);
    process.exit(1);
  }

  const pythonContent = fs.readFileSync(PYTHON_SCRIPT_PATH, "utf8");

  // Build EMBEDDED_MAP from TS constants (same structure as Python expects)
  const newMapContent = `EMBEDDED_MAP = {
    "header": [
        {"name": "chunkMagic", "offset_hex": "${toHex(offsets.HEADER_CHUNK_MAGIC_OFFSET)}", "type": "str4", "expected": "CcnK"},
        {"name": "firstChunkByteSize", "offset_hex": "${toHex(offsets.HEADER_FIRST_CHUNK_BYTE_SIZE_OFFSET)}", "type": "uint32_be", "min": 0, "max": 2147483647},
        {"name": "fxMagic", "offset_hex": "${toHex(offsets.HEADER_FX_MAGIC_OFFSET)}", "type": "str4", "expected_set": ["FxCk", "FPCh"]},
        {"name": "version", "offset_hex": "${toHex(offsets.HEADER_VERSION_OFFSET)}", "type": "uint32_be", "min": 0, "max": 2},
        {"name": "idUint", "offset_hex": "${toHex(offsets.HEADER_ID_UINT_OFFSET)}", "type": "uint32_be"},
        {"name": "fxVersion", "offset_hex": "${toHex(offsets.HEADER_FX_VERSION_OFFSET)}", "type": "uint32_be"},
        {"name": "count", "offset_hex": "${toHex(offsets.HEADER_COUNT_OFFSET)}", "type": "uint32_be"},
        {"name": "programName", "offset_hex": "${toHex(offsets.HEADER_PROGRAM_NAME_OFFSET)}", "type": "str28"},
    ],
    "FxCk_params_start_hex": "${toHex(offsets.FXCK_PARAMS_START)}",
    "FxCk_param_size_bytes": ${offsets.FXCK_PARAM_SIZE_BYTES},
    "FPCh_byteSize_hex": "${toHex(offsets.FPCH_BYTE_SIZE_OFFSET)}",
    "FPCh_chunk_start_hex": "${toHex(offsets.FPCH_CHUNK_START)}",
}`;

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
