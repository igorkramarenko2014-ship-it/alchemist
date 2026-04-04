#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REKOR_DEFAULT_URL = "https://rekor.sigstore.dev";

/**
 * AIOM v2: Rekor External Anchor (D.4)
 * Publishes the artifact signature and hash to a public transparency log.
 */
export async function publishToRekor(artifactPath) {
  if (!artifactPath || !existsSync(artifactPath)) {
    console.warn("[AIOM-REKOR] Skipping: No artifact path provided.");
    return null;
  }

  try {
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    const payload = {
        kind: "hashedrekord",
        apiVersion: "0.0.1",
        spec: {
            signature: {
                content: Buffer.from(artifact.signature).toString("base64"),
                publicKey: {
                    content: Buffer.from(artifact.public_key).toString("base64")
                }
            },
            data: {
                hash: {
                    algorithm: "sha256",
                    value: artifact.runner_output.state_hash
                }
            }
        }
    };

    console.log(`[AIOM-REKOR] Publishing hash ${artifact.runner_output.state_hash.slice(0,8)} to ${REKOR_DEFAULT_URL}...`);
    
    // We use a simple fetch-based approach (simulated for node 18+)
    const response = await fetch(`${REKOR_DEFAULT_URL}/api/v1/log/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Rekor API returned ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const logId = Object.keys(result)[0];
    console.log(`[AIOM-REKOR] SUCCESS: Entry recorded at ${logId.slice(0,16)}...`);
    return { logId, url: `${REKOR_DEFAULT_URL}/api/v1/log/entries/${logId}` };

  } catch (err) {
    console.error(`[AIOM-REKOR] FAILED — External anchor skipped: ${err.message}`);
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const latest = join(__dirname, "../../artifacts/verify/latest-execution.json");
    publishToRekor(latest);
}
