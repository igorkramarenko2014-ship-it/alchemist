/**
 * FXP encode: delegates to @alchemist/fxp-encoder WASM.
 * Build fxp-encoder with `pnpm run build:wasm` first.
 *
 * **Provenance:** does not embed metadata in FxCk bytes. Callers attach **`*.fxp.provenance.json`**
 * via **`buildFxpExportProvenanceV1`** (`fxp-provenance.ts`) after **`scoreCandidates`** / triad run.
 */
let encodeFn: ((params: Float32Array, programName: string) => Uint8Array) | null = null;

async function loadWasm(): Promise<void> {
  if (encodeFn != null) return;
  try {
    const mod = await import("@alchemist/fxp-encoder/wasm");
    encodeFn = mod.encode_fxp_fxck;
    if (typeof mod.default === "function") await mod.default();
  } catch (e) {
    throw new Error(
      "FXP encoder WASM not loaded. Build with: cd packages/fxp-encoder && pnpm run build:wasm. " +
        String(e)
    );
  }
  if (typeof encodeFn !== "function") throw new Error("encode_fxp_fxck not found on WASM module");
}

/**
 * Encode params and program name to FxCk FXP bytes.
 * Requires fxp-encoder WASM to be built.
 */
export async function encodeFxp(
  params: Float32Array,
  programName: string
): Promise<Uint8Array> {
  await loadWasm();
  const out = encodeFn!(params, programName);
  return out instanceof Uint8Array ? out : new Uint8Array(out);
}
