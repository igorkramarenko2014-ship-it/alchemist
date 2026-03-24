# VST wrapper (JUCE) — Alchemist

## Role

The **`apps/vst-wrapper`** project is a **skeleton JUCE VST3** intended as a **read-only consumer** of `.fxp` bytes that Alchemist already validated and pushed (see `packages/fxp-encoder/vst-bridge.ts`, `vst_observer` power cell).

It is **not** a substitute for HARD GATE (`tools/validate-offsets.py` / `scripts/validate-offsets-if-sample.mjs`). The plugin does not generate, repair, or validate presets.

## Honest capability boundary

Loading a file with **`setStateInformation` on this `AudioProcessor` stores the chunk as this plugin’s own state** (for DAW recall / inspection). It **does not** instruct the Serum VST to change presets. Driving Serum programmatically requires **hosting Serum inside an `AudioProcessorGraph`** (or equivalent) and is out of scope for this minimal tree.

## Igor / IOM

- Igor cell **`vst_wrapper`** lists only **`packages/shared-engine`** artifacts (`vst-wrapper-pulse.ts`, `iom-pulse.ts`) because `igor:sync` requires files under that package.
- **`getIOMHealthPulse().vstWrapperStatus`** is updated from TypeScript via **`recordVstWrapperPulseHint()`** when you bridge stderr logs; the JUCE binary does not call `logEvent` directly.

## Build and install

See **`apps/vst-wrapper/README.md`** and root **`pnpm build:vst`**.

## Legal

Serum and Xfer trademarks belong to their owners. This skeleton only reads files the operator places on disk; it does not ship Serum assets.
