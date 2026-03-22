# Transparent arbitration (not blackbox)

**Purpose:** Optional **three-stage** vote between two **ordering strategies** (**ALPHA** / **OMEGA**) on an existing **`AICandidate[]`** pool.

**Guarantees (Alchemist / FIRE):**

- **Telemetry:** every stage and the final outcome call **`logEvent`** (`arbitration_*`).
- **No bypass:** ordering uses **`scoreCandidates`** (validation + Slavic **0.80** cosine / **0.75** Dice + weights) before **ALPHA** vs **OMEGA** reordering.
- **Deterministic:** votes are **`djb2` hashes** of `runId`, `prompt`, pool fingerprint, and prior votes — **no `Math.random()`**.
- **Not wired** into **`runTriad`** by default — opt-in import where you explicitly want this behavior.

**Stages (awareness model):**

| Stage | Sees | Vote |
|-------|------|------|
| 1 | Pool fingerprint only | `ALPHA` or `OMEGA` |
| 2 | Stage 1 vote | `ALPHA` or `OMEGA` |
| 3 | Stage 1 + 2 votes | `ALPHA` or `OMEGA` |

**Majority:** **2 of 3** wins.

**Strategies:**

- **ALPHA:** order = **`scoreCandidates`** (high weighted score first).
- **OMEGA:** order = ascending **`weightedScore`** (after the same **`scoreCandidates`** filtering/dedupe).

**API:** `runTransparentArbitration(candidates, { prompt?, runId? })`.
