import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

/** Reads `pkg/` at request time — must not be statically baked at build. */
export const dynamic = "force-dynamic";

/**
 * True when skip-if-no-rust wrote the JS shim (export still throws at runtime).
 * Real wasm-pack output does not contain this string.
 */
function isStubEncoderGlue(jsPath: string): boolean {
  try {
    const head = fs.readFileSync(jsPath, "utf8").slice(0, 4096);
    return head.includes("WASM not built");
  } catch {
    return true;
  }
}

/**
 * Resolve `packages/fxp-encoder/pkg` without `require.resolve(.../package.json)` —
 * `@alchemist/fxp-encoder` does not export `./package.json`, which breaks Next/webpack.
 */
function resolveEncoderPkgDir(): string | null {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "packages", "fxp-encoder", "pkg"),
    path.join(cwd, "..", "packages", "fxp-encoder", "pkg"),
    path.join(cwd, "..", "..", "packages", "fxp-encoder", "pkg"),
    path.join(cwd, "..", "..", "..", "packages", "fxp-encoder", "pkg"),
  ];
  for (const pkgDir of candidates) {
    const normalized = path.normalize(pkgDir);
    const encoderRoot = path.join(normalized, "..");
    if (fs.existsSync(path.join(encoderRoot, "Cargo.toml")) && fs.existsSync(normalized)) {
      return normalized;
    }
  }
  return null;
}

/**
 * Mirrors **`scripts/lib/wasm-artifact-truth.mjs`** / **`pnpm assert:wasm`** — auditable mode, not human prose alone.
 * **`ok: true`** only when **`wasmArtifactTruth === "real"`**.
 */
export async function GET() {
  const pkgDir = resolveEncoderPkgDir();
  if (!pkgDir) {
    return NextResponse.json({
      ok: false,
      status: "unavailable" as const,
      wasmArtifactTruth: "pkg_missing" as const,
      message:
        "fxp-encoder pkg not found — open the monorepo root (folder with apps/ + packages/) and run pnpm dev from there",
    });
  }

  const stubMarker = path.join(pkgDir, ".stub");
  if (fs.existsSync(stubMarker)) {
    return NextResponse.json({
      ok: false,
      status: "unavailable" as const,
      wasmArtifactTruth: "stub_marker" as const,
      message:
        "pkg/.stub present — Rust wasm-pack build was skipped; run pnpm build:wasm for real WASM (same as assert:wasm)",
    });
  }

  const wasmPath = path.join(pkgDir, "fxp_encoder_bg.wasm");
  const jsPath = path.join(pkgDir, "fxp_encoder.js");

  if (!fs.existsSync(wasmPath)) {
    return NextResponse.json({
      ok: false,
      status: "unavailable" as const,
      wasmArtifactTruth: "missing_wasm" as const,
      message:
        "WASM binary missing — install Rust (https://rustup.rs), wasm32-unknown-unknown, then: cd packages/fxp-encoder && pnpm run build:wasm",
    });
  }

  if (!fs.existsSync(jsPath) || isStubEncoderGlue(jsPath)) {
    return NextResponse.json({
      ok: false,
      status: "unavailable" as const,
      wasmArtifactTruth: "stub_js" as const,
      message:
        "WASM glue is stubbed — run: cd packages/fxp-encoder && pnpm run build:wasm (requires Rust + wasm-pack)",
    });
  }

  return NextResponse.json({
    ok: true,
    status: "available" as const,
    wasmArtifactTruth: "real" as const,
    message: "WASM encoder artifacts present",
  });
}
