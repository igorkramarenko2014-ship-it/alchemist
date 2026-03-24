/**
 * Classify fxp-encoder `pkg/` state for **auditable** verify summaries (no dev server).
 * Mirrors **`GET /api/health/wasm`** and **`scripts/assert-wasm-available.mjs`** logic.
 * Does not exit the process — callers decide fail-closed (`REQUIRE_WASM=1` / `pnpm assert:wasm`).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** @typedef {"real" | "stub_marker" | "stub_js" | "missing_wasm" | "missing_js" | "pkg_missing" | "encoder_root_missing"} WasmArtifactTruth */

/**
 * @param {string} root — monorepo root (folder with `packages/fxp-encoder`)
 * @returns {{
 *   wasmArtifactTruth: WasmArtifactTruth,
 *   wasmBrowserFxpEncodeReady: boolean,
 *   wasmArtifactDetail: string,
 * }}
 */
export function getWasmArtifactTruthForSummary(root) {
  const encoderRoot = join(root, "packages", "fxp-encoder");
  const pkgDir = join(encoderRoot, "pkg");
  const wasmPath = join(pkgDir, "fxp_encoder_bg.wasm");
  const jsPath = join(pkgDir, "fxp_encoder.js");
  const stubMarker = join(pkgDir, ".stub");

  if (!existsSync(join(encoderRoot, "Cargo.toml"))) {
    return {
      wasmArtifactTruth: "encoder_root_missing",
      wasmBrowserFxpEncodeReady: false,
      wasmArtifactDetail: "packages/fxp-encoder or Cargo.toml missing",
    };
  }
  if (!existsSync(pkgDir)) {
    return {
      wasmArtifactTruth: "pkg_missing",
      wasmBrowserFxpEncodeReady: false,
      wasmArtifactDetail: "pkg/ absent — run pnpm build:wasm",
    };
  }
  if (existsSync(stubMarker)) {
    return {
      wasmArtifactTruth: "stub_marker",
      wasmBrowserFxpEncodeReady: false,
      wasmArtifactDetail: "pkg/.stub present — Rust wasm-pack build was skipped",
    };
  }
  if (!existsSync(wasmPath)) {
    return {
      wasmArtifactTruth: "missing_wasm",
      wasmBrowserFxpEncodeReady: false,
      wasmArtifactDetail: "fxp_encoder_bg.wasm missing",
    };
  }
  if (!existsSync(jsPath)) {
    return {
      wasmArtifactTruth: "missing_js",
      wasmBrowserFxpEncodeReady: false,
      wasmArtifactDetail: "fxp_encoder.js missing",
    };
  }
  let stubGlue = true;
  try {
    const head = readFileSync(jsPath, "utf8").slice(0, 4096);
    stubGlue = head.includes("WASM not built");
  } catch {
    stubGlue = true;
  }
  if (stubGlue) {
    return {
      wasmArtifactTruth: "stub_js",
      wasmBrowserFxpEncodeReady: false,
      wasmArtifactDetail: "fxp_encoder.js is skip-if-no-rust shim (WASM not built)",
    };
  }
  return {
    wasmArtifactTruth: "real",
    wasmBrowserFxpEncodeReady: true,
    wasmArtifactDetail: "wasm-pack artifacts present; browser .fxp encode path can load WASM",
  };
}
