#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

export function verifyArtifact() {
  const truthPath = join(root, "artifacts", "truth-matrix.json");
  const verifierBinary = join(root, "target", "release", "aiom-verify");
  const tempArtifactPath = join(root, "artifacts", "verify", "latest-execution.json");

  if (!existsSync(truthPath)) {
    console.error("AIOM-VERIFY: Missing truth-matrix.json");
    return false;
  }

  if (!existsSync(verifierBinary)) {
    console.error("AIOM-VERIFY: Missing verifier binary. Run 'pnpm build:rust' first.");
    return false;
  }

  // Phase D Requirement: The truth-matrix must point to the verifiable artifact
  const truth = JSON.parse(readFileSync(truthPath, "utf8"));
  if (!truth.trustless || !truth.trustless.verifiable) {
    console.error("AIOM-VERIFY: Artifact is NOT marked as verifiable in truth-matrix.");
    return false;
  }

  // D.3: Formal verification call
  try {
    const output = execFileSync(verifierBinary, ["verify", "--artifact", tempArtifactPath], { encoding: "utf8" });
    process.stdout.write(output);
    return output.includes("AIOM-VERIFY: VALID");
  } catch (err) {
    console.error("AIOM-VERIFY: FAILED — execution error");
    if (err.stderr) process.stderr.write(err.stderr);
    return false;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ok = verifyArtifact();
  process.exit(ok ? 0 : 1);
}
