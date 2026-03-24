#!/usr/bin/env node
/**
 * Configure + build **`apps/vst-wrapper`** (JUCE VST3).
 * First CMake configure may **FetchContent** JUCE (network).
 *
 * Usage: `node scripts/vst-build.mjs` or `pnpm build:vst`
 * Env: `JUCE_PATH` — optional path to a local JUCE tree with top-level CMakeLists.txt
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, platform } from "node:os";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const vstRoot = join(root, "apps", "vst-wrapper");
const buildDir = join(vstRoot, "build");

if (!existsSync(join(vstRoot, "CMakeLists.txt"))) {
  console.error("[build:vst] missing apps/vst-wrapper/CMakeLists.txt");
  process.exit(1);
}

mkdirSync(buildDir, { recursive: true });

const configure = spawnSync(
  "cmake",
  ["-B", buildDir, "-S", vstRoot, "-DCMAKE_BUILD_TYPE=Release"],
  { stdio: "inherit", env: process.env, cwd: vstRoot },
);
if (configure.status !== 0) {
  process.exit(configure.status ?? 1);
}

const build = spawnSync("cmake", ["--build", buildDir, "--config", "Release", "--parallel"], {
  stdio: "inherit",
  env: process.env,
  cwd: vstRoot,
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const artefacts = join(buildDir, "AlchemistFxpBridge_artefacts", "Release", "VST3");
if (!existsSync(artefacts)) {
  console.warn("[build:vst] VST3 artefacts folder not found — search under", buildDir);
  process.exit(0);
}

let vst3Path = null;
try {
  for (const name of readdirSync(artefacts)) {
    if (!name.endsWith(".vst3")) continue;
    const p = join(artefacts, name);
    if (statSync(p).isDirectory()) {
      vst3Path = p;
      break;
    }
  }
} catch {
  vst3Path = null;
}
if (!vst3Path || !existsSync(vst3Path)) {
  console.warn("[build:vst] could not locate .vst3 under", artefacts);
  process.exit(0);
}

const destDir =
  platform() === "darwin"
    ? join(homedir(), "Library", "Audio", "Plug-Ins", "VST3")
    : platform() === "win32"
      ? join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "Programs", "Common", "VST3")
      : join(homedir(), ".vst3");

const dest = join(destDir, vst3Path.split(/[/\\]/).pop());

try {
  mkdirSync(destDir, { recursive: true });
  cpSync(vst3Path, dest, { recursive: true });
  console.log("[build:vst] copied to", dest);
} catch (e) {
  console.warn("[build:vst] built OK but install copy failed:", e);
  console.warn("[build:vst] source bundle:", vst3Path);
}
