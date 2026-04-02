import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { fetchRoughtime } from "./fetch-roughtime.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

export async function signArtifact() {
  const truthPath = join(root, "artifacts", "truth-matrix.json");
  const keyPath = join(root, ".aiom-signing-key");

  if (!existsSync(truthPath) || !existsSync(keyPath)) {
    console.error("AIOM-SIGN: Missing truth-matrix.json or .aiom-signing-key");
    process.exit(1);
  }

  const truthMatrixRaw = readFileSync(truthPath, "utf8");
  const truthPayload = JSON.parse(truthMatrixRaw);
  const privateKeyPem = readFileSync(keyPath, "utf8");

  const externalTime = await fetchRoughtime();

  const payloadToSign = {
    artifactHash: crypto.createHash("sha256").update(truthMatrixRaw).digest("hex"),
    generationSequence: truthPayload.generationSequence,
    externalTimestamp: externalTime.timestamp,
    server: externalTime.server
  };

  const signature = crypto.sign(
    null,
    Buffer.from(JSON.stringify(payloadToSign)),
    crypto.createPrivateKey(privateKeyPem)
  ).toString("hex");

  const sigPath = join(root, "artifacts", "truth-matrix.sig");
  writeFileSync(sigPath, JSON.stringify({
    ...payloadToSign,
    signature,
    signer: "AIOM_V2_ED25519"
  }, null, 2));

  console.log(`[AIOM-SIGN] Signed v5 artifact. Sequence: ${truthPayload.generationSequence}. TSA: ${externalTime.server}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  signArtifact();
}
