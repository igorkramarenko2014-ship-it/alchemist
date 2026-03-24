#!/usr/bin/env npx tsx
/**
 * PNH model warfare CLI — writes `pnh-report.json` at repo root.
 *
 * Usage:
 *   pnpm pnh:model-warfare
 *   pnpm pnh:model-warfare -- --sequences=9 --target=all
 *   pnpm pnh:model-warfare -- --target=hard-gate --strict
 *
 * Requires `pnpm build:wasm` + `tools/sample_init.fxp` for **A1** (otherwise skipped).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  runPnhModelWarfare,
  type HardGateWarfareHooks,
  type WarfareTargetFilter,
} from "../packages/shared-engine/pnh/pnh-warfare-model.ts";

function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 20; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8")) as { name?: string; workspaces?: unknown };
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        /* ignore */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function parseArgs(argv: string[]) {
  let sequences = 9;
  let target: WarfareTargetFilter = "all";
  let strict = false;
  for (const a of argv) {
    if (a.startsWith("--sequences=")) {
      const n = Number(a.slice("--sequences=".length));
      if (Number.isFinite(n) && n >= 1) sequences = Math.min(9, Math.floor(n));
    } else if (a.startsWith("--target=")) {
      const t = a.slice("--target=".length) as WarfareTargetFilter;
      if (t === "all" || t === "hard-gate" || t === "triad" || t === "flow") target = t;
    } else if (a === "--strict") {
      strict = true;
    }
  }
  return { sequences, target, strict };
}

async function tryLoadHardGateHooks(root: string): Promise<HardGateWarfareHooks | undefined> {
  const samplePath = join(root, "tools", "sample_init.fxp");
  const wasmJs = join(root, "packages", "fxp-encoder", "pkg", "fxp_encoder.js");
  const wasmBin = join(root, "packages", "fxp-encoder", "pkg", "fxp_encoder_bg.wasm");
  if (!existsSync(samplePath) || !existsSync(wasmJs) || !existsSync(wasmBin)) {
    return undefined;
  }
  try {
    const mod = (await import(pathToFileURL(wasmJs).href)) as {
      initSync: (m: Uint8Array) => void;
      decode_fxp_fxck: (data: Uint8Array) => { params: Float32Array; programName?: string };
      encode_fxp_fxck: (params: Float32Array, programName: string) => Uint8Array;
    };
    mod.initSync(readFileSync(wasmBin));
    const sampleFxpBytes = new Uint8Array(readFileSync(samplePath));
    return {
      sampleFxpBytes,
      decodeFxck: (bytes) => {
        const o = mod.decode_fxp_fxck(bytes);
        return { params: o.params, programName: o.programName };
      },
      encodeFxck: (params, programName) => mod.encode_fxp_fxck(params, programName),
    };
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
  if (!root) {
    console.error("pnh-model-warfare: monorepo root not found");
    process.exit(2);
  }

  const argv = process.argv.slice(2).filter((a) => a !== "--");
  const { sequences, target, strict } = parseArgs(argv);
  const hardGateHooks = await tryLoadHardGateHooks(root);
  const report = runPnhModelWarfare({
    maxSequences: sequences,
    target,
    hardGateHooks,
  });

  const outPath = join(root, "pnh-report.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.error(`pnh-model-warfare: wrote ${outPath}`);
  console.error(
    `pnh-model-warfare: summary immune=${report.summary.immune} breach=${report.summary.breach} skipped=${report.summary.skipped}`,
  );

  const breachIds = report.sequences.filter((s) => s.outcome === "breach").map((s) => s.id);
  if (breachIds.length > 0) {
    console.error(`pnh-model-warfare: breaches: ${breachIds.join(", ")}`);
  }

  if (strict && report.summary.breach > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("pnh-model-warfare:", e);
  process.exit(2);
});
