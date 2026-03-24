/**
 * Append one JSON line to **`tools/iom-snapshots.jsonl`** (gitignored) with manifest hashes +
 * full **`getIOMHealthPulse({})`** payload. **Diagnostic / audit only** — no gate mutation.
 *
 * Usage: `pnpm iom:snapshot -- --provenance "pre-release-v1.2.3"`
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeEngineValuationHeuristic,
  getIgorOrchestratorManifest,
  getIOMHealthPulse,
} from "@alchemist/shared-engine";
import { collectEnginePackageMetrics } from "./lib/engine-package-scan";

function parseProvenance(argv: string[]): string {
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--provenance" && args[i + 1]) return args[i + 1]!;
    if (a.startsWith("--provenance=")) return a.slice("--provenance=".length);
  }
  const env = process.env.IOM_SNAPSHOT_PROVENANCE?.trim();
  return env ?? "";
}

function sha256Json(obj: unknown): string {
  return createHash("sha256").update(JSON.stringify(obj), "utf8").digest("hex");
}

function main(): void {
  const provenance = parseProvenance(process.argv);
  if (!provenance) {
    process.stderr.write(
      "[iom-snapshot] missing provenance. Use: pnpm iom:snapshot -- --provenance \"cron:health\" or IOM_SNAPSHOT_PROVENANCE\n",
    );
    process.exit(1);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, "..");
  const manifest = getIgorOrchestratorManifest();
  const pulse = getIOMHealthPulse({});
  const engineValuationHeuristic = computeEngineValuationHeuristic(collectEnginePackageMetrics(root));

  const row = {
    kind: "iom_snapshot_v1" as const,
    timestamp: new Date().toISOString(),
    provenance,
    manifestHash: sha256Json(manifest),
    powerCellsDigest: sha256Json(manifest.sharedEnginePowerCells),
    iomPulse: pulse,
    engineValuationHeuristic,
  };

  const toolsDir = join(root, "tools");
  mkdirSync(toolsDir, { recursive: true });
  const outPath = join(toolsDir, "iom-snapshots.jsonl");
  appendFileSync(outPath, `${JSON.stringify(row)}\n`, "utf8");
  process.stdout.write(`[iom-snapshot] appended → tools/iom-snapshots.jsonl (${row.timestamp})\n`);
}

main();
