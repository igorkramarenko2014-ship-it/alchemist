#!/usr/bin/env node
/**
 * Pulls GPU + local-LLM catalog JSON from BenD10/whatmodels (MIT) into
 * packages/shared-engine/talent/vendor/whatmodels/
 *
 * Upstream site: https://whatmodelscanirun.com/
 * Repo: https://github.com/BenD10/whatmodels
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const UPSTREAM = {
  name: "BenD10/whatmodels",
  license: "MIT",
  licenseUrl: "https://raw.githubusercontent.com/BenD10/whatmodels/main/LICENSE.md",
  site: "https://whatmodelscanirun.com/",
  repo: "https://github.com/BenD10/whatmodels",
  branch: "main",
  modelsPath: "src/lib/data/models.json",
  gpusPath: "src/lib/data/gpus.json",
};

function rawUrl(subPath) {
  return `https://raw.githubusercontent.com/${UPSTREAM.name}/${UPSTREAM.branch}/${subPath}`;
}

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8"));
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

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "alchemist-sync-whatmodels/1.0" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[alchemist] sync-whatmodels-vendor: monorepo root not found\n");
  process.exit(1);
}

const outDir = join(root, "packages", "shared-engine", "talent", "vendor", "whatmodels");
const modelsUrl = rawUrl(UPSTREAM.modelsPath);
const gpusUrl = rawUrl(UPSTREAM.gpusPath);

async function main() {
  mkdirSync(outDir, { recursive: true });
  process.stderr.write(`[alchemist] fetching whatmodels data…\n  ${modelsUrl}\n  ${gpusUrl}\n`);

  const [modelsText, gpusText] = await Promise.all([fetchText(modelsUrl), fetchText(gpusUrl)]);

  const models = JSON.parse(modelsText);
  const gpus = JSON.parse(gpusText);
  if (!Array.isArray(models) || !Array.isArray(gpus)) {
    throw new Error("expected models.json and gpus.json to be JSON arrays");
  }

  writeFileSync(join(outDir, "models.json"), `${JSON.stringify(models, null, 2)}\n`, "utf8");
  writeFileSync(join(outDir, "gpus.json"), `${JSON.stringify(gpus, null, 2)}\n`, "utf8");

  const manifest = {
    upstream: {
      ...UPSTREAM,
      modelsUrl,
      gpusUrl,
    },
    fetchedAt: new Date().toISOString(),
    modelCount: models.length,
    gpuCount: gpus.length,
  };
  writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  process.stderr.write(
    `[alchemist] wrote vendor/whatmodels: models=${models.length} gpus=${gpus.length}\n`
  );
}

main().catch((e) => {
  process.stderr.write(`[alchemist] sync-whatmodels-vendor failed: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
