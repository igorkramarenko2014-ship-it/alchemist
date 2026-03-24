#!/usr/bin/env node
/**
 * Wrapper: **`shared-engine`** ships TypeScript entrypoints — we run **`iom-status.ts`** via **`tsx`**.
 * Usage: `pnpm iom:status` → **`node scripts/iom-status.mjs`**
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const withPnpm = join(root, "scripts", "with-pnpm.mjs");
const script = join(root, "scripts", "iom-status.ts");

const r = spawnSync(
  process.execPath,
  [withPnpm, "exec", "tsx", script],
  { cwd: root, stdio: "inherit", env: { ...process.env, ALCHEMIST_PNPM_FALLBACK_QUIET: "1" } },
);

process.exit(r.status === null ? 1 : r.status);
