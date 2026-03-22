#!/usr/bin/env node
/**
 * Run pnpm from the monorepo root with the given args.
 * Falls back to `npx --yes pnpm@9.14.2` when `pnpm` is missing from PATH (Corepack not enabled).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pnpmArgs = process.argv.slice(2);

if (pnpmArgs.length === 0) {
  console.error("Usage: node scripts/with-pnpm.mjs <pnpm args…>");
  console.error("Example: node scripts/with-pnpm.mjs --filter @alchemist/web-app dev");
  process.exit(1);
}

function run(command, args) {
  return spawnSync(command, args, {
    stdio: "inherit",
    cwd: repoRoot,
    env: process.env,
    shell: process.platform === "win32",
  });
}

let result = run("pnpm", pnpmArgs);
if (result.error?.code === "ENOENT") {
  if (!process.env.ALCHEMIST_PNPM_FALLBACK_QUIET) {
    console.warn(
      "with-pnpm: `pnpm` not on PATH — using npx pnpm@9.14.2. For a permanent fix: corepack enable && corepack prepare pnpm@9.14.2 --activate\n"
    );
  }
  result = run("npx", ["--yes", "pnpm@9.14.2", ...pnpmArgs]);
}

process.exit(result.status ?? 1);
