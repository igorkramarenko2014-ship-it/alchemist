#!/usr/bin/env node
/**
 * Great Library Intake (GL Intake) — offline `.fxp` metadata validation.
 *
 * Canon: validate against HARD GATE before admitting any bytes-derived metadata.
 * It outputs a provenance-stamped JSON batch for operator-run merges.
 *
 * Usage (repo root):
 *   node tools/gl-intake.mjs --source ./my-preset-library/ --provenance "operator:..." --output tools/great-library-batches/bank-v1.json --jobRunId agl-batch-001
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const v = argv[i + 1];
    if (v && !v.startsWith("--")) {
      out[key] = v;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function walkDir(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkDir(p, out);
    else if (ent.isFile() && ent.name.toLowerCase().endsWith(".fxp")) out.push(p);
  }
  return out;
}

function logLine(event, payload = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...payload });
  process.stderr.write(`${line}\n`);
}

const args = parseArgs(process.argv);
const source = String(args.source ?? "");
const provenance = String(args.provenance ?? "").trim();
const output = String(args.output ?? "");
const jobRunId = typeof args.jobRunId === "string" ? args.jobRunId : undefined;

if (!source) throw new Error("--source is required");
if (!provenance) throw new Error("--provenance is required");
if (!output) throw new Error("--output is required");

const here = dirname(fileURLToPath(import.meta.url));
const validatePy = join(here, "..", "tools", "validate-offsets.py");

logLine("gl_intake_start", {
  source,
  provenance,
  jobRunId: jobRunId ?? null,
});

const files = walkDir(source, []);
const items = [];
let anyFail = false;

for (const fxpPath of files) {
  const fileName = fxpPath.split("/").pop() ?? fxpPath;
  const st = statSync(fxpPath);
  const bytes = readFileSync(fxpPath);
  const checksumSha256 = sha256Hex(bytes);
  const createdAtIso = st.birthtime?.toISOString?.() ?? st.mtime.toISOString();

  logLine("gl_intake_item", {
    fileName,
    fileSizeBytes: st.size,
    checksumSha256,
  });

  // HARD GATE: validate offsets against sourced map.
  const r = spawnSync("python3", [validatePy, fxpPath], {
    cwd: join(here, ".."),
    encoding: "utf8",
  });

  if (r.status !== 0) {
    anyFail = true;
    logLine("gl_intake_item_validation_failed", {
      fileName,
      exitCode: r.status,
      stderrTail: (r.stderr ?? "").trim().slice(0, 600),
    });
    continue;
  }

  items.push({
    id: fileName.replace(/\.fxp$/i, ""),
    fileName,
    fileSizeBytes: st.size,
    checksumSha256,
    createdAt: createdAtIso,
  });
}

const collectedAt = new Date().toISOString();
const batch = {
  schemaHint: "preset_metadata_batch_v1",
  provenance,
  collectedAt,
  jobRunId,
  items,
  // Contract with `mergeGreatLibraryIntoSoeSnapshot`: only `provenance` + optional `snapshotAugment`.
  // This script intentionally does not invent SOE numbers from bytes-derived metadata.
  snapshotAugment: {},
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(batch, null, 2), "utf8");

logLine("gl_intake_complete", {
  inputCount: files.length,
  validatedCount: items.length,
  anyFail,
  output,
});

process.exit(anyFail ? 1 : 0);

