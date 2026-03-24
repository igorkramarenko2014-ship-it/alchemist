/**
 * Resolve built JUCE **VST3 bundle** path (directory ending in `.vst3`) under
 * **`apps/vst-wrapper/build/.../VST3`**, matching **`scripts/vst-build.mjs`** output layout.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function findVst3BuildBundlePath(root) {
  const artefacts = join(
    root,
    "apps",
    "vst-wrapper",
    "build",
    "AlchemistFxpBridge_artefacts",
    "Release",
    "VST3",
  );
  if (!existsSync(artefacts)) return null;
  try {
    for (const name of readdirSync(artefacts)) {
      if (!name.endsWith(".vst3")) continue;
      const p = join(artefacts, name);
      if (statSync(p).isDirectory()) return p;
    }
  } catch {
    return null;
  }
  return null;
}
