#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { aggregateRefineryEvidence } from "./refinery-aggregator";
import { calibrateRefinery } from "./refinery-calibrator";

const here = dirname(fileURLToPath(import.meta.url));
const overridesPath = join(here, "refinery-overrides.json");

async function run() {
  const args = process.argv.slice(2);
  const cmd = args[0] || "check";

  switch (cmd) {
    case "check":
      await check();
      break;
    case "apply":
      await apply();
      break;
    case "rollback":
      await rollback();
      break;
    default:
      console.log("Usage: refinery [check|apply|rollback]");
  }
}

async function check() {
  console.log("--- Refinery: Evidence Aggregation ---");
  const evidence = aggregateRefineryEvidence();
  if (evidence.length === 0) {
    console.log("No high-confidence evidence buckets found (need >= 20 samples).");
    return;
  }

  console.table(evidence.map(b => ({
    policy: b.policyFamily,
    task: b.taskType,
    samples: b.sampleCount,
    alignment: b.meanAlignment.toFixed(3),
    gain: b.meanAlignmentGainV1.toFixed(3)
  })));

  console.log("\n--- Refinery: Calibration Proposals ---");
  const proposals = calibrateRefinery(evidence);
  if (proposals.length === 0) {
    console.log("No calibration proposals generated.");
    return;
  }

  proposals.forEach((p, i) => {
    console.log(`[${i}] ${p.policyFamily} (${p.taskType}):`);
    console.log(`    Nudge: ${JSON.stringify(p.nudge)}`);
    console.log(`    Evidence: gain=${p.provenance.meanGain.toFixed(3)}, samples=${p.provenance.sampleCount}`);
  });

  return proposals;
}

async function apply() {
  const proposals = await check();
  if (!proposals || proposals.length === 0) return;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("\nApply these proposals? (y/N): ");
  rl.close();

  if (answer.toLowerCase() === "y") {
    let manifest = { version: 0, lastUpdateUtc: new Date().toISOString(), overrides: [], cumulativeDriftCache: {} };
    if (existsSync(overridesPath)) {
      manifest = JSON.parse(readFileSync(overridesPath, "utf8"));
    }

    manifest.version++;
    manifest.lastUpdateUtc = new Date().toISOString();
    
    // Simple merge: append new overrides (v1 strategy)
    // In v2 we should deduplicate/merge based on cumulative drift
    manifest.overrides.push(...proposals);

    writeFileSync(overridesPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`Applied ${proposals.length} proposals. Manifest version: ${manifest.version}`);
  } else {
    console.log("Apply cancelled.");
  }
}

async function rollback() {
  if (existsSync(overridesPath)) {
    writeFileSync(overridesPath, JSON.stringify({ version: 0, lastUpdateUtc: new Date().toISOString(), overrides: [], cumulativeDriftCache: {} }, null, 2), "utf8");
    console.log("Overrides rolled back / cleared.");
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
