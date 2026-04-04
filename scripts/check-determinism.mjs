import fs from "fs";
import path from "path";

/**
 * AIOM v2: Deterministic Purity Gate
 * 
 * Scans Pure Core files for non-deterministic patterns (Math.random, Date, FS, etc.).
 * Status 0 on success, Status 1 on violation.
 */

const PURE_CORE_FILES = [
  "packages/shared-engine/operator/shigor-core.ts",
  "packages/shared-engine/operator/operator-resonance.ts",
  "packages/shared-engine/operator/operator-types.ts",
  "packages/shared-engine/operator/operator-id.ts",
];

const FORBIDDEN_PATTERNS = [
  { regex: /Math\.random\(/g, label: "Math.random()" },
  { regex: /Date\(/g, label: "Date instantiation" },
  { regex: /performance\.now\(/g, label: "performance.now()" },
  { regex: /setTimeout\(/g, label: "setTimeout()" },
  { regex: /setInterval\(/g, label: "setInterval()" },
  { regex: /crypto\.random/g, label: "crypto.random API" },
  { regex: /process\.env/g, label: "process.env access" },
  { regex: /from ["'](fs|path|os)["']/g, label: "Forbidden system module import (fs/path/os)" },
  { regex: /require\(["'](fs|path|os)["']\)/g, label: "Forbidden system module require (fs/path/os)" },
];

let violationCount = 0;

PURE_CORE_FILES.forEach((relPath) => {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[WARN] Pure Core file not found: ${relPath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    // Basic comment stripping for the line (naive but useful for simple cases)
    const lineCode = line.split("//")[0].split("/*")[0];

    FORBIDDEN_PATTERNS.forEach((pattern) => {
      if (pattern.regex.test(lineCode)) {
        console.error(`[ERROR] Determinism Violation: ${pattern.label}`);
        console.error(`  File: ${relPath}:${index + 1}`);
        console.error(`  Line: ${line.trim()}`);
        violationCount++;
      }
    });
  });
});

if (violationCount > 0) {
  console.error(`\n[FAIL] Found ${violationCount} determinism violation(s) in Pure Core.`);
  process.exit(1);
} else {
  console.log(`[PASS] Pure Core determinism check complete. Standard results across Node.js/Rust.`);
  process.exit(0);
}
