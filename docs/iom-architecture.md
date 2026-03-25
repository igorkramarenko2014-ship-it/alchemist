# IOM architecture (auto-generated)

Last sync: **2026-03-25** — run `pnpm igor:docs` to refresh after editing `igor-power-cells.json`.

## Power cells

### triad

- **Responsibility:** LLAMA/DEEPSEEK/QWEN fetch or stub; panel timing; gated scoring entry.
- **Artifacts:** `triad.ts`, `triad-monitor.ts`, `triad-panelist-prompt.ts`, `constants.ts`, `circuit-breaker.ts`

### gatekeeper

- **Responsibility:** Telemetry purity — IQR/Z score stream + optional durationMs temporal gate.
- **Artifacts:** `validate.ts`

### slavic_score

- **Responsibility:** Weighted ranking + cosine/text dedupe; creativePivot on dead end.
- **Artifacts:** `score.ts`, `intent-alignment.ts`, `gates.ts`

### undercover_adversarial

- **Responsibility:** Distribution / adversarial statistical gates on candidates.
- **Artifacts:** `validate.ts`

### soe

- **Responsibility:** SOE hints from triad health — telemetry only, not DSP buffers.
- **Artifacts:** `soe.ts`, `iom-schism-impact.ts`, `soe-hint-structured.ts`

### agent_fusion

- **Responsibility:** Brain §9a strings merged into operator-facing fusion lines.
- **Artifacts:** `agent-fusion.ts`, `brain-fusion-calibration.gen.ts`

### integrity

- **Responsibility:** Honest capability gaps, sprint completes, degraded fallbacks; WASM .fxp bridge; Igor manifest layer.
- **Artifacts:** `integrity.ts`, `encoder.ts`, `igor-orchestrator-layer.ts`, `engine-valuation-heuristic.ts`

### aji_entropy

- **Responsibility:** Entropy seeds + crystallized residue (TS-only distillation).
- **Artifacts:** `entropy.ts`, `aji-logic.ts`

### schism

- **Responsibility:** Bipolar sprint stance (CONSOLIDATE vs DISRUPT) — narrative + logs only; IOM pulse schisms.
- **Artifacts:** `schism.ts`, `iom-pulse.ts`, `iom-coverage.ts`

### triad_governance

- **Responsibility:** ATHENA/HERMES/HESTIA blend weights + velocity from wall time.
- **Artifacts:** `triad-panel-governance.ts`

### arbitration

- **Responsibility:** Transparent 2-of-3 arbitration — full logEvent trail.
- **Artifacts:** `arbitration/transparent-arbitration.ts`, `arbitration/types.ts`

### taxonomy

- **Responsibility:** Preset taxonomy pool narrow + sparse rank pre-Slavic.
- **Artifacts:** `taxonomy/engine.ts`, `taxonomy/prompt-keyword-sparse.ts`, `taxonomy/sparse-rank.ts`

### talent_market

- **Responsibility:** Market scout hints — deployer-owned benchmarks.
- **Artifacts:** `talent/market-scout.ts`

### tablebase

- **Responsibility:** Deterministic short-circuit candidates when tablebase hits; offline learning types + prompt fingerprint.
- **Artifacts:** `reliability/checkers-fusion.ts`, `reliability/tablebase-db.ts`, `reliability/tablebase-schema.ts`, `reliability/prompt-fingerprint.ts`, `learning/great-library.ts`, `learning/offline-pipeline-types.ts`

### perf_boss

- **Responsibility:** FIRE-compliant perf sweep — perf_boss_* JSON on stderr.
- **Artifacts:** `perf/compliant-perf-boss.ts`

### prompt_guard

- **Responsibility:** Triad prompt bounds, intent guard (`validateTriadIntent`), and rejection reasons.
- **Artifacts:** `prompt-guard.ts`, `intent-hardener.ts`, `pnh/pnh-triad-defense.ts`

### pnh

- **Responsibility:** Predictive Network Hardening — deterministic ghost probes, warfare model, APT-pattern catalog (TS gates + triad surface; no prod auto-patch).
- **Artifacts:** `pnh/pnh-ghost-run.ts`, `pnh/pnh-scenarios.ts`, `pnh/pnh-triad-defense.ts`, `pnh/pnh-warfare-model.ts`, `pnh/pnh-apt-scenarios.ts`

### vst_observer

- **Responsibility:** VST/Serum trial preset bridge — diagnostic pulse + operator/CLI; HARD GATE before any .fxp bytes; optional surgical-repair clamps; encoder push path in packages/fxp-encoder/vst-bridge.ts (Igor artifacts stay under shared-engine per sync script).
- **Artifacts:** `vst-observer.ts`, `iom-pulse.ts`, `surgical-repair.ts`

### vst_wrapper

- **Responsibility:** JUCE VST3 FXP bridge skeleton (apps/vst-wrapper) — read-only consumer of validated .fxp; stores chunk as plugin state; does not inject Serum. Pulse: vst-wrapper-pulse.ts.
- **Artifacts:** `vst-wrapper-pulse.ts`, `iom-pulse.ts`

### preset_share

- **Responsibility:** User-consented shareable preset pages — slug generation, score gate (≥0.85), OG metadata from real candidate fields, paramArray visual only (no .fxp bytes exposed).
- **Artifacts:** `../../apps/web-app/lib/share-preset.ts`, `../../apps/web-app/lib/preset-store.ts`, `../../apps/web-app/app/presets/[slug]/page.tsx`, `../../apps/web-app/app/api/presets/share/route.ts`

