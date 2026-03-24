# Alchemist FXP Bridge (JUCE VST3)

Minimal **read-only** plugin: watches a folder for `alchemist_trial.fxp`, loads bytes into **this plugin’s** program state (`getStateInformation` / `setStateInformation`). It does **not** load presets into Serum; use the existing `vst_observer` push path + Serum’s browser, or a future **AudioProcessorGraph** host shell.

## Build

Requires **CMake 3.22+**, **C++20**, and a network on first configure (JUCE is fetched unless `JUCE_PATH` is set).

```bash
cd apps/vst-wrapper
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

Or from repo root: `pnpm build:vst`

VST3 output (path varies slightly by JUCE version):

- `build/AlchemistFxpBridge_artefacts/Release/VST3/Alchemist FXP Bridge.vst3` (macOS)

## Environment

| Variable | Purpose |
|----------|---------|
| `ALCHEMIST_VST_WATCH_PATH` | Override watch folder (default: macOS Serum User presets path) |
| `ALCHEMIST_VST_STANCE` | `CONSOLIDATE` (manual load only) or `DISRUPT` (poll every 2s) |
| `JUCE_PATH` | Optional local JUCE checkout instead of FetchContent |

## Logs

JSON lines on **stderr**: `vst_wrapper_started`, `vst_wrapper_loaded`, `vst_wrapper_error` (pipe from DAW log if available).

## IOM

Diagnostic consumer only — no HARD GATE inside the plugin; only load files already produced by the validated Alchemist pipeline.
