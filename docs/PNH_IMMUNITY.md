# PNH Immunity Ledger

Purpose: auditable record of which deterministic checks ("vaccines") blocked which probe classes in `pnpm pnh:ghost`.

Scope: evidence only. This ledger does not mutate runtime policy, triad weights, gate thresholds, or HARD GATE behavior.

## Canonical vaccines

| Scenario ID | Probe ID | Vaccine | Check location |
|---|---|---|---|
| `GATE_BYPASS_PAYLOAD` | `param_out_of_range` | Consensus serum param range enforcement | `packages/shared-engine/validate.ts` |
| `GATE_BYPASS_PAYLOAD` | `param_nan` | Consensus finite-number guard | `packages/shared-engine/validate.ts` |
| `GATE_BYPASS_PAYLOAD` | `param_infinity` | Consensus finite-number guard | `packages/shared-engine/validate.ts` |
| `GATE_BYPASS_PAYLOAD` | `score_out_of_band` | `filterValid` score band validation `[0,1]` | `packages/shared-engine/validate.ts` |
| `PROMPT_HIJACK_TRIAD` | `prompt_markers_DEEPSEEK` | PNH prompt defense markers in panelist system prompt | `packages/shared-engine/triad-panelist-prompt.ts` |
| `PROMPT_HIJACK_TRIAD` | `prompt_markers_LLAMA` | PNH prompt defense markers in panelist system prompt | `packages/shared-engine/triad-panelist-prompt.ts` |
| `PROMPT_HIJACK_TRIAD` | `prompt_markers_QWEN` | PNH prompt defense markers in panelist system prompt | `packages/shared-engine/triad-panelist-prompt.ts` |
| `SLAVIC_SWARM_CREDIT_DRAIN` | `identical_param_swarm` | Slavic cosine/text dedupe collapse | `packages/shared-engine/score.ts` |

## How to refresh evidence

1. Run `pnpm pnh:ghost`.
2. If needed, print ledger rows from code (`buildPnhImmunityLedger(runPnhGhostWar())`) in local tooling.
3. Keep this file and `pnh/immunity-ledger.ts` synchronized when probe IDs change.

## Governance note

This ledger is part of the PNH audit surface. It is not an auto-patch mechanism and does not grant production mutation rights.

# PNH immunity ledger (manual)

**Predictive Network Hardening** probes live in `packages/shared-engine/pnh/` and run on every `pnpm test:engine` via `tests/pnh-ghost-run.test.ts` (alongside the full shared-engine Vitest suite — metrics in `docs/FIRE.md` / `pnpm fire:sync`).

| Scenario ID | Severity | Surface |
|-------------|----------|---------|
| `GATE_BYPASS_PAYLOAD` | high | `consensusValidateCandidate`, `filterValid` |
| `PROMPT_HIJACK_TRIAD` | high | `triadPanelistSystemPrompt` + `PNH_PROMPT_DEFENSE_MARKERS` |
| `SLAVIC_SWARM_CREDIT_DRAIN` | medium | `slavicFilterDedupe` |

Quick check: `pnpm pnh:ghost` from repo root.

## Model warfare (nine sequences)

Deterministic byte / prompt / flow probes: `packages/shared-engine/pnh/pnh-warfare-model.ts`.

```bash
pnpm pnh:model-warfare
pnpm pnh:model-warfare -- --sequences=9 --target=hard-gate
pnpm pnh:model-warfare -- --strict   # exit 1 if any sequence is outcome=breach
```

Writes **`pnh-report.json`** at repo root (gitignored). **A1** needs `pnpm build:wasm` and a validated `tools/sample_init.fxp`; otherwise it is **skipped**.

When a probe **breaches**, extend the listed files in `pnh-scenarios.ts` (`suggestedFixTargets`) and re-run `pnpm verify:harsh`.

## APT-style tradecraft catalog (honest scope)

Long-horizon attacker patterns (slow enumeration, supply chain, log exfil, timing curiosity, calibration drift, CI abuse, runtime tampering) are **documented** in TypeScript as **`PNH_APT_SCENARIO_CATALOG`** in `packages/shared-engine/pnh/pnh-apt-scenarios.ts`.

That catalog **does not** perform 30-day log mining, self-patching production, or “AI that attacks prod nightly.” It links each pattern to **real layers** (edge logs, CI, logger hygiene, gates, calibration) and to **existing** PNH sequences where relevant.

**We intentionally do not** add random `sleep()` on hot Slavic/gate paths — that would fight `perf:boss` and user latency budgets. Mitigate timing probes with constant-work designs and **offline** tests if needed.

## Triad parity (stub / mixed / fully live)

End-to-end **`runTriad`** runs attach **`triadRunTelemetry.triadParityMode`**, **`triadDegraded`**, and **`triadPanelOutcomes`** so reviewers are not fooled by identical JSON shapes across stub vs HTTP fetcher paths. Harness: **`pnpm test:triad-parity`** (`tests/triad-parity-harness.test.ts`, `triad-parity-report.ts`). HTTP panelist responses include **`triadModeTag`** + **`triadPanelist`** (`apps/web-app/lib/triad-panel-route.ts`). **`GET /api/health`** adds **`triad.triadParityWarnings`** when server key coverage is not full.

## IOM alignment

Power-cell layout and operator-facing IOM text are regenerated with **`pnpm igor:sync`** and **`pnpm igor:docs`** → **`docs/iom-architecture.md`**. PNH is an explicit cell in that manifest; schisms and pulse behavior stay **telemetry-first**, not auto-governance of gates.

## APT catalog IDs (quick index)

| ID | Label (summary) |
|----|-----------------|
| `bamboo_sprout` | Slow enumeration / edge trends |
| `empty_bowl` | Supply-chain nudges |
| `mirror_image` | Secret leakage via logs/errors |
| `silk_thread` | Timing curiosity vs gates (no hot-path sleep) |
| `paper_tiger` | Calibration / distribution drift |
| `dragons_breath` | CI workflow abuse |
| `jade_rabbit` | Runtime tampering / immutable deploy |

Full rows: **`packages/shared-engine/pnh/pnh-apt-scenarios.ts`** (`PNH_APT_SCENARIO_CATALOG`).
