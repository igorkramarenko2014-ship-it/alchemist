#!/usr/bin/env node
"use strict";
const { execSync, spawnSync } = require("child_process");
const path = require("path");

function hasCargo() {
  try {
    execSync("cargo --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!hasCargo()) {
  console.warn("Skipping WASM build: Rust/cargo not installed. Install from https://rustup.rs then run: pnpm run build:wasm");
  const fs = require("fs");
  const pkgDir = path.join(__dirname, "..", "pkg");
  if (!fs.existsSync(pkgDir)) fs.mkdirSync(pkgDir, { recursive: true });
  // Drop stale wasm-pack outputs so health checks and the UI do not disagree (stub JS + old .wasm).
  for (const name of [
    "fxp_encoder_bg.wasm",
    "fxp_encoder_bg.wasm.d.ts",
  ]) {
    try {
      fs.unlinkSync(path.join(pkgDir, name));
    } catch {
      /* absent */
    }
  }
  const stub = `export default async function init() {}
export function encode_fxp_fxck() {
  throw new Error("WASM not built. Install Rust from https://rustup.rs then: cd packages/fxp-encoder && pnpm run build:wasm");
}
export function decode_fxp_fxck() {
  throw new Error("WASM not built. Install Rust from https://rustup.rs then: cd packages/fxp-encoder && pnpm run build:wasm");
}
`;
  fs.writeFileSync(path.join(pkgDir, "fxp_encoder.js"), stub);
  fs.writeFileSync(path.join(pkgDir, ".skip"), "WASM not built; Rust not installed.\n");
  process.exit(0);
}

const out = spawnSync("pnpm", ["run", "build:wasm"], {
  cwd: path.resolve(__dirname, ".."),
  stdio: "inherit",
});
process.exit(out.status ?? 1);
