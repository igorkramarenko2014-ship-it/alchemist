#!/usr/bin/env node
/**
 * Inspect `.fxp` export lineage sidecar written by the web app.
 *
 *   pnpm fxp:inspect path/to/Export.fxp
 *   pnpm fxp:inspect path/to/Export.fxp.provenance.json
 *
 * Looks for sibling `*.fxp.provenance.json` when given a `.fxp` path.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const argv = process.argv.slice(2);
const target = argv.find((a) => !a.startsWith("-"));

function usage() {
  process.stderr.write(
    "Usage: pnpm fxp:inspect <file.fxp | file.fxp.provenance.json>\n",
  );
  process.exit(2);
}

function resolveSidecarPath(p) {
  if (!p) return null;
  if (p.endsWith(".fxp.provenance.json")) return p;
  if (p.endsWith(".fxp")) return `${p}.provenance.json`;
  return null;
}

function main() {
  if (!target) usage();
  const sidecar = resolveSidecarPath(target);
  if (!sidecar || !existsSync(sidecar)) {
    const alt = join(dirname(target), `${basename(target, ".fxp")}.provenance.json`);
    if (existsSync(alt)) {
      printReport(alt, target);
      return;
    }
    console.error(`fxp-inspect: missing sidecar — expected:\n  ${sidecar ?? "(none)"}`);
    process.exit(1);
  }
  printReport(sidecar, target.endsWith(".fxp") ? target : null);
}

function printReport(sidecarPath, fxpPath) {
  let raw;
  try {
    raw = readFileSync(sidecarPath, "utf8");
  } catch (e) {
    console.error("fxp-inspect: read failed", e);
    process.exit(1);
  }
  /** @type {unknown} */
  let j;
  try {
    j = JSON.parse(raw);
  } catch {
    console.error("fxp-inspect: invalid JSON in sidecar");
    process.exit(1);
  }
  const o = j && typeof j === "object" ? j : {};
  const rec = /** @type {Record<string, unknown>} */ (o);

  console.log("=== Alchemist FXP provenance ===");
  if (fxpPath) console.log("FxP file:", fxpPath);
  console.log("Sidecar:", sidecarPath);
  console.log("");

  const warnings = [];
  if (rec.schema !== "alchemist.fxp_provenance") {
    warnings.push(`schema mismatch (got ${String(rec.schema)})`);
  }
  if (rec.version !== 1) {
    warnings.push(`version unexpected (got ${String(rec.version)})`);
  }
  if (rec.hardGateValidated === true) {
    warnings.push(
      "hardGateValidated=true — confirm this was merged from CI attestation; browser exports should be false.",
    );
  }
  if (rec.exportTrustTier === "unverified") {
    warnings.push("exportTrustTier=unverified — incomplete lineage, health, or WASM snapshot.");
  }
  if (rec.wasmReal !== true) {
    warnings.push("wasmReal is not true — stub or health mismatch at export.");
  }
  if (Array.isArray(rec.notes) && rec.notes.length === 0) {
    warnings.push("notes[] empty — unusual for v1 sidecar.");
  }

  console.log(JSON.stringify(j, null, 2));
  console.log("");
  if (warnings.length) {
    console.log("--- warnings ---");
    for (const w of warnings) console.log(`  • ${w}`);
  } else {
    console.log("--- warnings ---\n  (none heuristics)");
  }
}

main();
