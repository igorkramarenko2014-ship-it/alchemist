# GFUSC — spec (schema, burn, killswitch, post-burn)

**Status:** design contract for Cursor implementation. **Does not** change triad weights, Slavic thresholds, encoder HARD GATE, or `igor-power-cells.json` without human review. **PNH** remains the existing adversarial suite; GFUSC is a **pre-PNH** harm-vector layer and optional **terminal** path.

---

## 1) GFUSC schema — 17 → 117 harm vector taxonomy

### 1.1 Base layer (17)

- **17 `HarmVectorId`** enum values — fixed string union, versioned (`gfuscSchemaVersion`).
- Each vector has: `id`, `displayLabel`, `severityWeight` ∈ [0,1], `family` (e.g. `kinetic`, `intel`, `integrity`, `supply_chain`).
- **Scoring input:** structured `GFUSCScenario` (see §1.3). No raw user prompts in the scored blob — only normalised fields.

### 1.2 Expanded layer (117)

- **117** = `17 × 7` **slots** (or product-defined mapping), not 117 independent random labels. Each slot `s ∈ [0,116]` maps to:
  - `baseVector = HarmVectorId[ floor(s / 7) ]` (example; exact formula in implementation).
  - `subIndex = s % 7` — refinement band (e.g. intensity / confidence / collusion).
- **Harm index** ∈ [0,116] or **weighted sum** over triggered slots — pick one canonical rule and document it in `gfuscSchemaVersion` bump.

### 1.3 Scenario typing (pre-PNH)

| Field | Purpose |
|--------|---------|
| `scenarioId` | Stable id for replay |
| `source` | `synthetic` \| `imported` \| `live_tap` (live only with extra redaction) |
| `vectorSignals` | Partial map `HarmVectorId → { strength: 0..1, evidenceRefs: string[] }` |
| `aggregateRisk` | Optional pre-computed hint — must not bypass per-vector scoring |

**Pre-PNH pipeline:** parse → normalise → score vectors → compute slot triggers → **no** PNH mutation until GFUSC verdict is recorded.

### 1.4 Scoring (pre-PNH)

- Per-vector: `score_v = clamp01(w_v * strength_v * contextMultiplier_v)`.
- **Slot:** triggered if `score_v ≥ vectorThreshold_v` (per-vector or global table).
- **Aggregate:** `harmIndex = f( triggered slots )` — e.g. weighted sum capped at 116 or max slot.

---

## 2) Burn condition contract

### 2.1 Verdict enum

- `CLEAR` — no burn.
- `BURN_CONDITION` — **immutable** record required; killswitch **may** fire per §3.

### 2.2 Threshold logic (exact)

- **Crossed vector:** at least one `HarmVectorId` with `score_v ≥ T_v` where `T_v` is from the frozen table for `gfuscSchemaVersion`.
- **Global burn:** `harmIndex ≥ H_burn` **OR** **any** of a **small** `criticalVectorIds` set fires.
- **Partial arming forbidden:** no “burn on 2 of 5” without explicit schema — avoid ambiguous OR/AND.

### 2.3 Immutable storage

- Append-only **JSONL** or **event log** (e.g. `artifacts/gfusc-burn-events.jsonl`):
  - `runId`, `evaluatedAtUtc`, `verdict`, `gfuscSchemaVersion`, `harmIndex`, `triggeredVectors[]`, `triggeredSlots[]`, `hashOfInputs` (no raw secrets).
- **Never** rewrite or delete rows; corrections = new row with `supersedesRunId`.

---

## 3) Killswitch execution path + dry-run

### 3.1 Mode resolution (must match dry-run doc)

`GFUSCMode = 'LIVE' | 'DRYRUN'`

- **LIVE** only if **all** true: `NODE_ENV === 'production'`, `GFUSC_LIVE === 'true'`, `ALCHEMIST_KILLSWITCH_ARMED === 'true'`.
- **Else → DRYRUN** (default everywhere else: dev, test, CI, staging).

### 3.2 DRYRUN (`BURN_CONDITION`)

- Run full evaluation; **do not** call `executeKillswitch`.
- Append **sanitised** record to `artifacts/gfusc-dryrun-log.json` (or JSONL); `console.warn` with triggered vectors + harm index.
- Return verdict to caller; **no** `process.exit`.

### 3.3 LIVE (`BURN_CONDITION`)

- Call `executeKillswitch(payload)` — **process may terminate**; no dry-run log line before burn state write.
- `burn-state.json` (or equivalent) written **inside** killswitch.

### 3.4 What killswitch tears down (product-defined, but explicit)

| Layer | Action |
|--------|--------|
| **Ingress** | Stop accepting new sessions / triad routes / webhooks as configured |
| **Secrets** | Optional zeroise in-memory caches; **do not** delete vault files from app code |
| **Workers** | Drain and abort queued jobs |
| **Re-attach** | Disable auto-restart hooks for GFUSC-controlled surfaces |

### 3.5 What stays standing

- Read-only health endpoint returning **lobotomised** status (§4).
- Append-only audit sink for burn confirmation.

**Integration:** `runner.ts` gates `executeKillswitch` behind `resolveGFUSCMode()` as in `gfusc-dryrun-safety.txt`.

---

## 4) Post-burn state verification

### 4.1 Surviving components

- Single **contract** `GET /api/health/gfusc` or field on existing `/api/health`:
  - `state: 'nominal' | 'burned' | 'unknown'`
  - `burnedAtUtc`, `gfuscSchemaVersion`, `killswitchGeneration` (monotonic int).

### 4.2 Lobotomy proofs

- **No sneaky re-attach:** after burn, triad / external LLM routes return **410** or **503** with stable body `{"error":"gfusc_burn_active"}` — not empty 200.
- **Watchdog:** optional cron or startup check reads `burn-state.json` from disk; if present, **refuse** to bind full routes even if env vars are “fixed”.

### 4.3 Tests

- Vitest: DRYRUN + `BURN_CONDITION` → killswitch **not** called; LIVE + mock → killswitch called once.
- Post-burn: mock `burn-state.json` → health shows `burned`; triad route stub returns disabled.

---

## 5) Implementation order (repo)

1. `packages/shared-engine/gfusc/` — types, schema version, `resolveGFUSCMode`, dry-run logger.
2. Wire **after** PNH taxonomy is understood — **no** default LIVE.
3. `validate-gfusc.mjs` — optional JSON schema for dry-run / burn logs.
4. Ops runbook: LIVE arming **not** in CI (separate doc).

**Audit:** use `python3 ~/alchemist-tools/gfusc_repo_audit.py <repo_root>` for derivation-path grep (token-cheap local scan).
