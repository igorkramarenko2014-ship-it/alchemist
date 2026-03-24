# PNH immunity ledger (manual)

**Predictive Network Hardening** probes live in `packages/shared-engine/pnh/` and run on every `pnpm test:engine` via `tests/pnh-ghost-run.test.ts`.

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
