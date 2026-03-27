# Truth matrix (operator)

**Generated:** 2026-03-27 — refresh with `pnpm truth:matrix`.

This table is **normative intent**: it summarizes how stub vs fetcher vs tablebase, WASM health, and HARD GATE strictness interact. **Runtime** JSON for the product slice lives at **`GET /api/health/truth-matrix`** (built from `apps/web-app/lib/truth-matrix.ts`).

## Execution tiers (summary)

| Tier | Role | Examples |
|------|------|----------|
| **1** | User-outcome / hot path | `triad`, `taxonomy`, `tablebase` (short-circuit), `slavic_score`, `undercover_adversarial`, `prompt_guard`, `preset_share`, `integrity` (export/capability signals) |
| **2** | Ship-blocking verification | `assert:hard-gate`, `assert:wasm`, `verify:harsh`, `verify:web`, `run-verify-with-summary.mjs`, `igor:ci`, `vst_observer` (HARD GATE bridge) |
| **3** | Advisory / diagnostic only | `soe`, `schism`, `agent_fusion`, `triad_governance`, `talent_market`, `perf_boss`, `pnh`, `arbitration` (opt-in), `vst_wrapper` pulse — **no gate mutation, no export authority, no triad override** |

Registry: `packages/shared-engine/execution-tiers.json` + `execution-tiers.ts`.

## Release receipt

After every `pnpm verify:harsh` / `pnpm harshcheck`, a machine-readable copy of **`verify_post_summary`** is written to:

- `artifacts/verify/verify-post-summary.json`
- `.artifacts/verify/verify-post-summary.json`
- `artifacts/verify/verify-receipt-<git-sha>.json` and `verify-receipt-latest.json`

Stderr line remains the grep-friendly source of truth for log pipelines.

## Scenarios

| Scenario | Triad mode | Candidates | Gates | Browser export | Authoritative .fxp | Health / verify | Operator message |
|----------|------------|------------|-------|----------------|---------------------|-----------------|------------------|
| No provider keys | stub (HTTP 503 triad_unconfigured or client stub) | Stub fixtures / client stub fetcher | Yes (same TS gates on candidates) | Only if WASM pkg real + /api/health/wasm available | No unless HARD GATE validated + WASM encode path | GET /api/health → triad partial/none / pnpm verify:harsh can be green | Rankings ≠ live triad; run verify:keys / set keys for parity tests. |
| All provider keys set | fetcher (fully_live when all succeed) | Live panelists | Yes | Independent of triad; needs WASM | HARD GATE + WASM | triadFullyLive often true / Green does not prove live keys in CI (no secrets) | CI uses stub; local keys needed for live calibration. |
| Tablebase keyword hit | tablebase short-circuit | Deterministic from tablebase | Yes (post short-circuit path) | N/A to tablebase | HARD GATE still applies to bytes | Same as WASM/triad flags / Green | Tablebase is Tier 1 execution (changes outcome vs miss). |
| WASM pkg missing or stub | Any | Any | Yes | Disabled / unavailable | No | GET /api/health/wasm → unavailable / pnpm verify:harsh green; pnpm harshcheck:wasm may fail | pnpm build:wasm then REQUIRE_WASM=1 pnpm assert:wasm |
| WASM pkg real | Any | Any | Yes | Enabled when health wasm available | Still needs HARD GATE for Serum bytes truth | wasm ok + wasmArtifactTruth real / Optional harshcheck:wasm | Green verify:harsh ≠ export-ready without assert:wasm. |
| tools/sample_init.fxp missing, strict off | Any | Any | Yes | If WASM ok | Risk: offsets not proven on real preset | hardGate files may still show map present / pnpm assert:hard-gate warns and exits 0 | Set ALCHEMIST_STRICT_OFFSETS=1 for fail-closed. |
| ALCHEMIST_STRICT_OFFSETS=1, sample missing | Any | Any | Yes | N/A | Blocked | N/A / assert:hard-gate exits 1 | Add real init .fxp under tools/ or skip strict mode. |
| Preset share only | stub or fetcher | User-selected gated candidate | Share uses score/reasoning/paramArray gates | No .fxp on SharedPreset | No | N/A / Green | Sharing is not export; no Serum bytes exposed. |
| PR touches packages/fxp-encoder (release-sensitive) | Any | Any | Yes | pnpm verify:ci enforces strict wasm if diff matches | Enforced by pipeline | N/A / verify:ci may fail without wasm pkg + strict gate | scripts/enforce-release-strict-gates.mjs after verify:harsh |
