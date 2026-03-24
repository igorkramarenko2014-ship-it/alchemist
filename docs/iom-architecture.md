# IOM architecture (auto-generated)

Last sync: **2026-03-24** — run `pnpm igor:docs` to refresh after editing `igor-power-cells.json`.

## Power cells

### triad

- **Responsibility:** LLAMA/DEEPSEEK/QWEN fetch or stub; panel timing; gated scoring entry.
- **Artifacts:** `triad.ts`, `triad-monitor.ts`, `constants.ts`

### gatekeeper

- **Responsibility:** Telemetry purity — IQR/Z score stream + optional durationMs temporal gate.
- **Artifacts:** `validate.ts`

### slavic_score

- **Responsibility:** Weighted ranking + cosine/text dedupe; creativePivot on dead end.
- **Artifacts:** `score.ts`, `gates.ts`

### undercover_adversarial

- **Responsibility:** Distribution / adversarial statistical gates on candidates.
- **Artifacts:** `validate.ts`

### soe

- **Responsibility:** SOE hints from triad health — telemetry only, not DSP buffers.
- **Artifacts:** `soe.ts`

### agent_fusion

- **Responsibility:** Brain §9a strings merged into operator-facing fusion lines.
- **Artifacts:** `agent-fusion.ts`, `brain-fusion-calibration.gen.ts`

### integrity

- **Responsibility:** Honest capability gaps, sprint completes, degraded fallbacks; WASM .fxp bridge; Igor manifest layer.
- **Artifacts:** `integrity.ts`, `encoder.ts`, `igor-orchestrator-layer.ts`

### aji_entropy

- **Responsibility:** Entropy seeds + crystallized residue (TS-only distillation).
- **Artifacts:** `entropy.ts`, `aji-logic.ts`

### schism

- **Responsibility:** Bipolar sprint stance (CONSOLIDATE vs DISRUPT) — narrative + logs only; IOM pulse schisms.
- **Artifacts:** `schism.ts`, `iom-pulse.ts`

### triad_governance

- **Responsibility:** ATHENA/HERMES/HESTIA blend weights + velocity from wall time.
- **Artifacts:** `triad-panel-governance.ts`

### arbitration

- **Responsibility:** Transparent 2-of-3 arbitration — full logEvent trail.
- **Artifacts:** `arbitration/transparent-arbitration.ts`, `arbitration/types.ts`

### taxonomy

- **Responsibility:** Preset taxonomy pool narrow + sparse rank pre-Slavic.
- **Artifacts:** `taxonomy/engine.ts`, `taxonomy/sparse-rank.ts`

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

- **Responsibility:** Triad prompt bounds and rejection reasons.
- **Artifacts:** `prompt-guard.ts`

