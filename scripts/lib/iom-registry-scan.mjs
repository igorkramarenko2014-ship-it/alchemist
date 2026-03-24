/**
 * Shared ghost scan for **`igor-power-cells.json`** artifacts vs `packages/shared-engine` sources.
 * Used by **`igor-self-heal`**, **`igor-ci-check`**, and optionally **`igor-docs`**.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

export const IOM_REGISTRY_CROSS_CUTTING = new Set(["index.ts", "telemetry.ts"]);

export function isSkippableEngineTs(relPosix) {
  if (!relPosix.endsWith(".ts")) return true;
  if (relPosix.endsWith(".d.ts")) return true;
  if (relPosix.endsWith(".test.ts")) return true;
  if (relPosix.endsWith(".gen.ts")) return true;
  if (relPosix.includes("/tests/")) return true;
  if (relPosix === "vitest.config.ts") return true;
  return false;
}

export function walkEngineTsFiles(dir, engineRoot) {
  const out = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist" || ent.name === "tests") continue;
      out.push(...walkEngineTsFiles(abs, engineRoot));
      continue;
    }
    if (!ent.isFile()) continue;
    const rel = relative(engineRoot, abs).split("\\").join("/");
    if (isSkippableEngineTs(rel)) continue;
    out.push(rel);
  }
  return out;
}

export function loadRegisteredArtifactsSet(powerCellsPath) {
  const raw = readFileSync(powerCellsPath, "utf8");
  const cells = JSON.parse(raw);
  if (!Array.isArray(cells)) throw new Error("igor-power-cells.json: expected array");
  const set = new Set();
  for (const c of cells) {
    if (!c || typeof c !== "object") continue;
    const arts = c.artifacts;
    if (!Array.isArray(arts)) continue;
    for (const a of arts) {
      if (typeof a === "string") set.add(a.split("\\").join("/"));
    }
  }
  return { artifactSet: set, cellCount: cells.length };
}

/**
 * @param {string} repoRoot monorepo root (contains packages/shared-engine)
 * @returns {{ ghostArtifacts: string[], cellCount: number, engineRoot: string, powerCellsPath: string }}
 */
export function scanIomGhostArtifacts(repoRoot) {
  const engineRoot = join(repoRoot, "packages", "shared-engine");
  const powerCellsPath = join(engineRoot, "igor-power-cells.json");
  if (!existsSync(powerCellsPath) || !statSync(engineRoot).isDirectory()) {
    throw new Error("packages/shared-engine or igor-power-cells.json missing");
  }
  const { artifactSet, cellCount } = loadRegisteredArtifactsSet(powerCellsPath);
  const seen = new Set();
  for (const rel of walkEngineTsFiles(engineRoot, engineRoot)) {
    if (IOM_REGISTRY_CROSS_CUTTING.has(rel)) continue;
    if (!artifactSet.has(rel)) seen.add(rel);
  }
  return {
    ghostArtifacts: [...seen].sort(),
    cellCount,
    engineRoot,
    powerCellsPath,
  };
}

export function inferGhostHealthCheckHint(artifactPath) {
  const base = artifactPath.replace(/\.ts$/, "").split("/").pop() ?? artifactPath;
  const slug = base.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  return `pnpm test:engine:grep -- --grep ${slug}`;
}

export function inferGhostConfidence(artifactPath) {
  const p = artifactPath.toLowerCase();
  if (p.includes("triad") || p.includes("score") || p.includes("validate") || p.includes("soe"))
    return 0.88;
  if (p.includes("igor") || p.includes("iom")) return 0.86;
  return 0.62;
}
