# Surgical repair — clamping contract

**Scope:** Post-gate, **presentation / transport** fixes on **`AICandidate`** for VST-observer and similar paths. **Implementation:** `packages/shared-engine/surgical-repair.ts` (`performSurgicalRepair`, `repairAndPushToVst`).

## Non-goals (integrity)

- **Does not** bypass the Serum **HARD GATE** (`serum-offset-map.ts` + `validate-offsets.py` on a real `.fxp`).
- **Does not** repair invalid consensus / Undercover / Slavic outcomes — run full gates first; repair operates on candidates already treated as gate-valid for the chosen pipeline.
- **Does not** invent or rewrite **`SerumState`** fields beyond what the repair explicitly documents (today: **`paramArray`**, **`reasoning`**, **`score`** only).
- **Does not** replace encoder logic or offset-derived bytes.

## Allowed operations (`RepairOptions`)

| Option | `CLAMP` behavior | `LOG_ONLY` behavior |
|--------|------------------|---------------------|
| **`clampParams`** | Each **`paramArray`** entry: non-numeric → `0.5`; numeric → clamp to `[0, 1]` | Same checks; logs would-be changes only |
| **`enforceReasoningMinChars`** | Pad short **`reasoning`**; empty → short auditable placeholder | Logs would-be pad/placeholder |
| *(implicit)* | **`score`** clamped to `[0, 1]` if present | Same, log-only |

**Defaults:** `clampParams: true`, `enforceReasoningMinChars: 15`, `mode: "CLAMP"`, `provenance: "vst_observer"`.

## Telemetry & IOM

- **`logEvent`** — `surgical_repair_applied` | `surgical_repair_log_only` | `surgical_repair_noop` | `surgical_repair_error`.
- Heavy repair bursts enqueue **`VST_SURGICAL_REPAIR_HEAVY`** (warn) for **`drainSurgicalRepairSchisms()`** — operational visibility, not automatic rollback.

## Future tightening

- Field-specific clamps (e.g. per-index semantics) require **documented** ranges tied to **`validateSerumParamArray`** / offset map — not ad hoc widening of this contract.
