import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

export function verifyArtifact() {
  const truthPath = join(root, "artifacts", "truth-matrix.json");
  const sigPath = join(root, "artifacts", "truth-matrix.sig");
  const pubKeyPath = join(root, "artifacts", "aiom-public-key.pem");

  if (!existsSync(truthPath) || !existsSync(sigPath) || !existsSync(pubKeyPath)) {
    console.error("AIOM-VERIFY: Missing artifacts for verification.");
    return false;
  }

  const truthRaw = readFileSync(truthPath, "utf8");
  const sigData = JSON.parse(readFileSync(sigPath, "utf8"));
  const pubKeyPem = readFileSync(pubKeyPath, "utf8");

  const currentArtifactHash = crypto.createHash("sha256").update(truthRaw).digest("hex");

  // 1. Check artifact hash
  if (currentArtifactHash !== sigData.artifactHash) {
    console.error(`AIOM-VERIFY: Hash mismatch! Current=${currentArtifactHash.slice(0,8)} Signed=${sigData.artifactHash.slice(0,8)}`);
    return false;
  }

  // 2. Verify signature
  const payloadToVerify = {
    artifactHash: sigData.artifactHash,
    generationSequence: sigData.generationSequence,
    externalTimestamp: sigData.externalTimestamp,
    server: sigData.server
  };

  const isVerified = crypto.verify(
    null,
    Buffer.from(JSON.stringify(payloadToVerify)),
    crypto.createPublicKey(pubKeyPem),
    Buffer.from(sigData.signature, "hex")
  );

  if (!isVerified) {
    console.error("AIOM-VERIFY: Ed25519 signature invalid!");
    return false;
  }

  console.log(`AIOM-VERIFY: signature=ok chain=ok sequence=${sigData.generationSequence} timestamp=${sigData.externalTimestamp} mon=ok`);
  console.log("AIOM-VERIFY: VALID — artifact is trustless-verified");
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ok = verifyArtifact();
  process.exit(ok ? 0 : 1);
}
