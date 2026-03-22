# @alchemist/fxp-encoder

Serum (VST2) FXP encode/decode. Offsets from `serum-offset-map.ts` / `tools/serum_offset_map_sourced.json`, validated by `tools/validate-offsets.py`.

- **TypeScript:** `serum-offset-map.ts` — constants only (no placeholders).
- **Rust → WASM:** `encode_fxp_fxck(params, programName)`, `decode_fxp_fxck(bytes)`.

## Build WASM (requires Rust)

1. Install Rust: <https://rustup.rs> — then `rustup target add wasm32-unknown-unknown`
2. wasm-pack: `cargo install wasm-pack` or `npx wasm-pack` (see `package.json` script)
3. From this package: **`pnpm run build:wasm`**

Output: **`pkg/`** (JS + WASM glue). On success, **`scripts/clear-stub-marker.cjs`** removes **`pkg/.skip`** (marker from stub builds).

## When Rust is missing (`pnpm build` at repo root)

**`scripts/skip-if-no-rust.cjs`** runs instead of wasm-pack: writes a stub **`fxp_encoder.js`** (throws on encode), writes **`pkg/.skip`**, and **deletes** any leftover **`fxp_encoder_bg.wasm`** / **`fxp_encoder_bg.wasm.d.ts`** so the web app’s **`GET /api/health/wasm`** and **`encodeFxp`** stay consistent (no “WASM file + stub JS”).

**`pnpm harshcheck`** can still pass without Rust; browser **Export .fxp** stays disabled until **`build:wasm`** succeeds.

## Usage (after build)

```ts
import init, { encode_fxp_fxck, decode_fxp_fxck } from "@alchemist/fxp-encoder/wasm";
await init(); // or init(await import("@alchemist/fxp-encoder/wasm/fxp_encoder_bg.wasm"))
const bytes = encode_fxp_fxck(new Float32Array([0, 0]), "Init");
const out = decode_fxp_fxck(bytes); // { programName, params }
```

**Product docs:** **`docs/FIRESTARTER.md` §10**, **`docs/FIRE.md` §C / §D**.
