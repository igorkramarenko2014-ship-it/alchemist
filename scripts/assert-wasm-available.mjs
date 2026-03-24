#!/usr/bin/env node
/**
 * Filesystem check mirroring **`GET /api/health/wasm`** — no dev server.
 * Use after **`pnpm build:wasm`** in release / deploy pipelines when browser **`.fxp`** export ships.
 *
 * **`REQUIRE_WASM=1`** (alias for exit 1 on failure) — same intent as docs HTML packs.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const raw = readFileSync(pj, "utf8");
        const j = JSON.parse(raw);
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

function isStubEncoderGlue(jsPath) {
  try {
    const head = readFileSync(jsPath, "utf8").slice(0, 4096);
    return head.includes("WASM not built");
  } catch {
    return true;
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  console.error("assert-wasm-available: monorepo root not found");
  process.exit(1);
}

const pkgDir = join(root, "packages", "fxp-encoder", "pkg");
const encoderRoot = join(root, "packages", "fxp-encoder");
const wasmPath = join(pkgDir, "fxp_encoder_bg.wasm");
const jsPath = join(pkgDir, "fxp_encoder.js");
const stubMarker = join(pkgDir, ".stub");

const requireWasm =
  process.env.REQUIRE_WASM === "1" || process.env.ALCHEMIST_REQUIRE_WASM === "1";

function fail(msg) {
  console.error(`assert-wasm-available: ${msg}`);
  process.exit(requireWasm ? 1 : 0);
}

if (!existsSync(join(encoderRoot, "Cargo.toml"))) {
  console.error("assert-wasm-available: packages/fxp-encoder missing");
  process.exit(1);
}

if (!existsSync(pkgDir)) {
  fail(
    "pkg/ missing — run: pnpm build:wasm (Rust + wasm32-unknown-unknown + wasm-pack).",
  );
}

if (existsSync(stubMarker)) {
  fail(
    "pkg/.stub present — encoder skipped Rust build; run pnpm build:wasm for real WASM.",
  );
}

if (!existsSync(wasmPath)) {
  fail("fxp_encoder_bg.wasm missing — run pnpm build:wasm.");
}

if (!existsSync(jsPath) || isStubEncoderGlue(jsPath)) {
  fail("fxp_encoder.js missing or stubbed — run pnpm build:wasm.");
}

console.log("assert-wasm-available: OK — WASM encoder artifacts present (matches /api/health/wasm)");
process.exit(0);
