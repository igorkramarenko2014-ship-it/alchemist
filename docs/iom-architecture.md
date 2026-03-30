# IOM architecture (auto-generated)

Last sync: **2026-03-30** — run `pnpm igor:docs` to refresh after editing `igor-power-cells.json`.

> Diagnostic firewall: Tier 3 is advisory-only and must never mutate Tier 1 outcomes without an explicit tested bridge.

## Operational cells (Tier 1 + Tier 2)

### triad

- **Tier:** `tier1_hot_path`
- **Recommendation:** `KEEP`
- **Responsibility:** LLAMA/DEEPSEEK/QWEN fetch or stub; panel timing; gated scoring entry. triadPanelistSystemPrompt injects distinct PANELIST_DNA_SEED lines (ATHENA/HERMES/HESTIA vs wire ids) + elaboration; HARD GATE line forbids byte invention — verified triad-panelist-prompt.test.ts.
- **Artifacts:** `triad.ts`, `triad-monitor.ts`, `candidate-finalizer.ts`, `triad-constraint-injection.ts`, `creative-diversity-layer.ts`, `power-logic-fusion.ts`, `arbitration/social-probe.ts`, `triad-panelist-prompt.ts`, `triad-panelist-system-prompt.ts`, `explainability/decision-receipt.ts`, `constants.ts`, `circuit-breaker.ts`, `triad-parity-report.ts`

### gatekeeper

- **Tier:** `tier1_hot_path`
- **Recommendation:** `KEEP`
- **Responsibility:** Telemetry purity — IQR/Z score stream + optional durationMs temporal gate.
- **Artifacts:** `validate.ts`

### slavic_score

- **Tier:** `tier1_hot_path`
- **Recommendation:** `KEEP`
- **Responsibility:** Weighted ranking + cosine/text dedupe; creativePivot on dead end.
- **Artifacts:** `score.ts`, `intent-alignment.ts`, `gates.ts`

### undercover_adversarial

- **Tier:** `tier1_hot_path`
- **Recommendation:** `KEEP`
- **Responsibility:** Distribution / adversarial statistical gates on candidates.
- **Artifacts:** `validate.ts`

### integrity

- **Tier:** `tier1_hot_path`
- **Recommendation:** `KEEP`
- **Responsibility:** Honest capability gaps, sprint completes, degraded fallbacks; WASM .fxp bridge; AIOM manifest layer.
- **Artifacts:** `integrity.ts`, `encoder.ts`, `igor-orchestrator-layer.ts`, `engine-valuation-heuristic.ts`, `fxp-provenance.ts`

### taxonomy

- **Tier:** `tier1_hot_path`
- **Recommendation:** `KEEP`
- **Responsibility:** Preset taxonomy pool narrow + sparse rank pre-Slavic.
- **Artifacts:** `taxonomy/engine.ts`, `taxonomy/prompt-keyword-sparse.ts`, `taxonomy/sparse-rank.ts`, `taxonomy/safe-process.ts`

### tablebase

- **Tier:** `tier1_hot_path`
- **Recommendation:** `KEEP`
- **Responsibility:** Deterministic short-circuit candidates when tablebase hits; offline learning types + prompt fingerprint.
- **Artifacts:** `reliability/checkers-fusion.ts`, `reliability/tablebase-db.ts`, `reliability/tablebase-schema.ts`, `reliability/prompt-fingerprint.ts`, `learning/great-library.ts`, `learning/offline-pipeline-types.ts`

### prompt_guard

- **Tier:** `tier1_hot_path`
- **Recommendation:** `KEEP`
- **Responsibility:** Triad prompt bounds, intent guard (`validateTriadIntent`), and rejection reasons.
- **Artifacts:** `prompt-guard.ts`, `intent-hardener.ts`, `pnh/pnh-triad-defense.ts`

### vst_observer

- **Tier:** `tier2_release_truth`
- **Recommendation:** `KEEP`
- **Responsibility:** VST/Serum trial preset bridge — diagnostic pulse + operator/CLI; HARD GATE before any .fxp bytes; optional surgical-repair clamps; encoder push path in packages/fxp-encoder/vst-bridge.ts (AIOM artifacts stay under shared-engine per sync script).
- **Artifacts:** `vst-observer.ts`, `iom-pulse.ts`, `surgical-repair.ts`

### preset_share

- **Tier:** `tier1_hot_path`
- **Recommendation:** `KEEP`
- **Responsibility:** User-consented shareable preset pages — slug generation, score gate (≥0.85), OG metadata from real candidate fields, paramArray visual only (no .fxp bytes exposed).
- **Artifacts:** `../../apps/web-app/lib/share-preset.ts`, `../../apps/web-app/lib/preset-store.ts`, `../../apps/web-app/app/presets/[slug]/page.tsx`, `../../apps/web-app/app/api/presets/share/route.ts`

## Quarantined advisory cells (Tier 3)

| Cell | Tier | Recommendation | Advisory policy |
|------|------|----------------|-----------------|
| `soe` | `tier3_advisory` | `QUARANTINE` | diagnostic only, no gate mutation / no export authority / no triad override |
| `agent_fusion` | `tier3_advisory` | `QUARANTINE` | diagnostic only, no gate mutation / no export authority / no triad override |
| `aji_entropy` | `tier3_advisory` | `QUARANTINE` | diagnostic only, no gate mutation / no export authority / no triad override |
| `schism` | `tier3_advisory` | `QUARANTINE` | diagnostic only, no gate mutation / no export authority / no triad override |
| `triad_governance` | `tier3_advisory` | `QUARANTINE` | diagnostic only, no gate mutation / no export authority / no triad override |
| `arbitration` | `tier3_advisory` | `KEEP_TRANSPARENT_ONLY` | diagnostic only, no gate mutation / no export authority / no triad override |
| `talent_market` | `tier3_advisory` | `QUARANTINE` | diagnostic only, no gate mutation / no export authority / no triad override |
| `perf_boss` | `tier3_advisory` | `QUARANTINE` | diagnostic only, no gate mutation / no export authority / no triad override |
| `pnh` | `tier3_advisory` | `QUARANTINE` | diagnostic only, no gate mutation / no export authority / no triad override |
| `vst_wrapper` | `tier3_advisory` | `QUARANTINE` | diagnostic only, no gate mutation / no export authority / no triad override |

