import fs from "node:fs";
import path from "node:path";

/**
 * Monorepo root when dev server cwd is **`apps/web-app`** or repo root.
 */
function resolveMonorepoRoot(): string | null {
  const cwd = process.cwd();
  const candidates = [cwd, path.join(cwd, ".."), path.join(cwd, "..", ".."), path.join(cwd, "..", "..", "..")];
  for (const c of candidates) {
    const norm = path.normalize(c);
    if (fs.existsSync(path.join(norm, "apps", "vst-wrapper", "CMakeLists.txt"))) {
      return norm;
    }
  }
  return null;
}

/** Same layout as **`scripts/lib/vst-bundle-resolve.mjs`** / **`vst-build.mjs`**. */
export function findVst3BuildBundlePathFromRoot(root: string): string | null {
  const artefacts = path.join(
    root,
    "apps",
    "vst-wrapper",
    "build",
    "AlchemistFxpBridge_artefacts",
    "Release",
    "VST3",
  );
  if (!fs.existsSync(artefacts)) return null;
  try {
    for (const name of fs.readdirSync(artefacts)) {
      if (!name.endsWith(".vst3")) continue;
      const p = path.join(artefacts, name);
      if (fs.statSync(p).isDirectory()) return p;
    }
  } catch {
    return null;
  }
  return null;
}

export type VstHealthSnapshot = {
  ok: boolean;
  status: "available" | "unavailable";
  bundleBasename: string | null;
  message: string;
};

export function getVstHealthSnapshot(): VstHealthSnapshot {
  const root = resolveMonorepoRoot();
  if (!root) {
    return {
      ok: false,
      status: "unavailable",
      bundleBasename: null,
      message: "Could not resolve monorepo root (expected apps/vst-wrapper/CMakeLists.txt).",
    };
  }
  const bundle = findVst3BuildBundlePathFromRoot(root);
  if (!bundle) {
    return {
      ok: false,
      status: "unavailable",
      bundleBasename: null,
      message:
        "No VST3 bundle under apps/vst-wrapper/build/.../VST3. Run pnpm build:vst from repo root. Optional sidecar — not required for web triad or WASM export.",
    };
  }
  const bundleBasename = path.basename(bundle);
  return {
    ok: true,
    status: "available",
    bundleBasename,
    message: `Built bundle: ${bundleBasename} (see docs/vst-wrapper.md; HARD GATE via pnpm vst:observe:gate).`,
  };
}
