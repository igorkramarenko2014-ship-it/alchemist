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

## APT-style tradecraft catalog (honest scope)

Long-horizon attacker patterns (slow enumeration, supply chain, log exfil, timing curiosity, calibration drift, CI abuse, runtime tampering) are **documented** in TypeScript as **`PNH_APT_SCENARIO_CATALOG`** in `packages/shared-engine/pnh/pnh-apt-scenarios.ts`.

That catalog **does not** perform 30-day log mining, self-patching production, or “AI that attacks prod nightly.” It links each pattern to **real layers** (edge logs, CI, logger hygiene, gates, calibration) and to **existing** PNH sequences where relevant.

**We intentionally do not** add random `sleep()` on hot Slavic/gate paths — that would fight `perf:boss` and user latency budgets. Mitigate timing probes with constant-work designs and **offline** tests if needed.
