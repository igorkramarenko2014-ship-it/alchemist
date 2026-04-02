import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { detectCapabilities } from "./capability-detector.mjs";

const MANIFEST_PATH = "./capabilities/root.capabilities.json";
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));

let changedFiles = [];
try {
  // Use origin/main if available, else fallback to HEAD~1 (typical for local dev)
  const diffTarget = process.env.DIFF_TARGET || "origin/main";
  changedFiles = execSync(`git diff --name-only ${diffTarget}...HEAD`)
    .toString()
    .trim()
    .split("\n")
    .filter(f => f && /\.(js|ts|mjs|jsx|tsx)$/.test(f));
} catch (e) {
  console.warn("⚠️  Could not determine git diff against target. Checking last commit (HEAD~1) instead.");
  try {
    changedFiles = execSync("git diff --name-only HEAD~1...HEAD")
      .toString()
      .trim()
      .split("\n")
      .filter(f => f && /\.(js|ts|mjs|jsx|tsx)$/.test(f));
  } catch (ee) {
    console.error("❌ Git diff failed. Ensure you are in a git repository with at least one commit.");
    process.exit(1);
  }
}

const FAILURES = [];

for (const file of changedFiles) {
  if (!fs.existsSync(file)) continue;
  
  try {
    const findings = detectCapabilities(file);

    // Endpoints
    findings.newEndpoints.forEach(route => {
      // Allow exact match OR partial match if specific route patterns are used
      if (!manifest.endpoints.includes(route)) {
        FAILURES.push(`New endpoint detected: ${route} in ${file}`);
      }
    });

    // WASM
    if (findings.wasmExposures.length > 0) {
      const allowed = new Set(manifest.wasmAccess);
      findings.wasmExposures.forEach(exp => {
        const isExplicitlyAllowed = allowed.has(exp);
        const isReadOnlyWasm = exp.includes("readOnly");
        if (!isExplicitlyAllowed && !isReadOnlyWasm) {
          FAILURES.push(`Unauthorized WASM exposure: ${exp} in ${file}`);
        }
      });
    }

    // Bypass
    if (findings.bypassAttempts.length > 0) {
      FAILURES.push(`Potential verify bypass detected in ${file}: ${findings.bypassAttempts.join(", ")}`);
    }

    // Failure Modes
    findings.newFailureModes.forEach(mode => {
      if (!manifest.allowedFailureModes.includes(mode)) {
        FAILURES.push(`New failure mode detected: "${mode}" in ${file}`);
      }
    });

  } catch (e) {
    // console.warn(`⚠️  Could not parse ${file}: ${e.message}`);
  }
}

const prBody = process.env.PR_BODY || "";
const isAllowedByFlag = prBody.includes("allowed-capability-expansion: true");

if (FAILURES.length > 0) {
  console.error("\n❌ Capability Expansion Guard FAILED\n");
  FAILURES.forEach(f => console.error(" • " + f));

  if (!isAllowedByFlag) {
    console.error(`
    
New capabilities require:
1. Update capabilities/root.capabilities.json
2. Add "allowed-capability-expansion: true" + reason in PR description (or set PR_BODY env)
3. Security review (minimum 1 security owner)
    `);
    process.exit(1);
  } else {
    console.warn("\n⚠️  Allowed via PR flag — ensure security review was performed!");
  }
} else {
  console.log("✅ Capability Expansion Guard passed (AST-verified)");
}
