/**
 * One-shot offline diagnostic: **`iomPulse`**, **`getIOMCoverageReport`**, optional live triad slice from **`GET /api/health`**.
 *
 * Usage (repo root):
 *   pnpm igor:checkup
 *   ALCHEMIST_CHECKUP_BASE_URL=http://127.0.0.1:3000 pnpm igor:checkup
 *
 * Emits a single JSON object on stdout — pipe to `jq` or your log store. Diagnostic only; no mutation.
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getIgorOrchestratorManifest,
  getIOMCoverageReport,
  getIOMHealthPulse,
} from "@alchemist/shared-engine";

function collectAllEngineTestRelPaths(engineRoot: string): string[] {
  const testsDir = join(engineRoot, "tests");
  const out: string[] = [];
  function walk(dir: string, prefix: string) {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
      const abs = join(dir, ent.name);
      if (ent.isDirectory()) walk(abs, rel);
      else if (ent.isFile() && ent.name.endsWith(".test.ts")) {
        out.push(`tests/${rel.split("\\").join("/")}`);
      }
    }
  }
  walk(testsDir, "");
  return [...new Set(out)].sort();
}

async function fetchHealthTriad(baseUrl: string): Promise<Record<string, unknown> | null> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/health`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const j = (await res.json()) as Record<string, unknown>;
    return {
      httpOk: res.ok,
      triad: j.triad,
      wasm: j.wasm,
      iomPulsePresent: typeof j.iomPulse === "object",
      igorOrchestratorPresent: typeof j.igorOrchestrator === "object",
    };
  } catch (e) {
    return { fetchError: String(e) };
  }
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, "..");
  const engineRoot = join(root, "packages", "shared-engine");
  const manifest = getIgorOrchestratorManifest();
  const cells = manifest.sharedEnginePowerCells;
  const executed = collectAllEngineTestRelPaths(engineRoot);
  const iomCoverage = getIOMCoverageReport(cells, executed);
  const iomPulse = getIOMHealthPulse({});

  const base = process.env.ALCHEMIST_CHECKUP_BASE_URL?.trim();
  let healthSample: Record<string, unknown> | null = null;
  if (base) {
    healthSample = await fetchHealthTriad(base);
  }

  const payload = {
    ok: true,
    generatedAtMs: Date.now(),
    note:
      "Offline IOM checkup — no gate mutation. Set ALCHEMIST_CHECKUP_BASE_URL for optional /api/health triad slice.",
    igorOrchestrator: {
      layerVersion: manifest.layerVersion,
      powerCellCount: manifest.sharedEnginePowerCells.length,
      packageCount: manifest.packages.length,
    },
    iomPulse,
    iomCoverage,
    healthFromDevServer: healthSample,
  };

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main().catch((e) => {
  process.stderr.write(`${String(e?.stack ?? e)}\n`);
  process.exit(1);
});
