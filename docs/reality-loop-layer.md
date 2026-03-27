# Reality Loop Layer (RLL)

**Purpose:** Close the gap between **internal verify truth** (FIRE, gates, triad diversity) and **what happens in the world** (preset used, edited, discarded, exported). This doc is **policy + contracts**; it does not grant shadow governance.

**Canon:** RLL signals are **observability and SOE hints only**. They **must not** silently change Undercover/Slavic thresholds, triad blend weights, or routes. Any behavioral change ships as **reviewed TypeScript** and explicit operator workflow — same firewall as IOM (`docs/iom.md`, `alchemist-healthy-ai-environment.mdc`).

---

## Layer stack (explicit)

1. **Philosophy / intent** — human product goals (docs, skills, tone) — not executable law.
2. **Policy** — versioned rules in repo (gates, timeouts, weights).
3. **Execution** — `runTriad`, `scoreCandidates`, API routes.
4. **Reality Loop (this layer)** — structured events from clients/servers → log store → optional rollups → **hints** in SOE / health (no auto-mutation of policy).

Triad consensus reduces **single-model brittleness**; it is **not** a claim of factual or moral alignment. Ground truth signals measure **product fit**, not “model correctness.”

---

## Ground truth signals (not vanity KPIs)

| Signal | Meaning |
|--------|---------|
| **Used** | Operator committed to an output (e.g. selected candidate, continued flow). |
| **Modified** | Output edited before use (params, copy) — implies friction. |
| **Discarded** | Output abandoned — implies mismatch or failure. |
| **Export attempted / succeeded** | WASM path and trust tier — ties to HARD GATE honesty. |

Naming in code: `REALITY_TELEMETRY_EVENTS` and `logRealitySignal` in `@alchemist/shared-engine` (`reality-signals-log.ts`). Types: `@alchemist/shared-types` (`reality-signals.ts`).

**Privacy / security:** Payloads use **hashes and enums** — no raw prompts in telemetry (`telemetry-redact.ts` still applies). **Learning policy:** stub fallback outcomes are **not learning-eligible by default**. To enable stub learning, set explicit IOM policy and opt in (`ALCHEMIST_ALLOW_STUB_LEARNING=1`). **Operational priority:** keep stub usage at the absolute minimum — it is **Plan Z** (last resort continuity), never a routine fallback target. Retention and lawful basis belong in `PRIVACY.md` before wide deployment.

---

## SOE integration

`SoeTriadSnapshot` may include optional **`realityGroundTruth`** (`RealityGroundTruthAggregate`). When sample sizes are sufficient, `computeSoeRecommendations` may append a **single human-readable line** about low adoption — **hint only**, same class as existing fusion lines. Gates ignore this field.

---

## Explore vs exploit (product mode)

`RealityExploreMode` in shared-types is a **typed flag** for product UX (e.g. bias toward tablebase vs novelty). **Loosening TS gates** in production requires a **separate, audited profile** — not an implicit side effect of `explore`.

---

## Tablebase and “learning substrate”

`preset_tablebase_hit` remains **telemetry**. Turning hits into **offline** ranking or datasets is allowed **with provenance and review**; automatic gate or weight updates from tablebase stats are **out of scope** until explicitly designed and merged like any other policy change.

---

## Failure intelligence

Structured failures already exist (PNH, gate drops, verify receipts). RLL adds **outcome** taxonomy. Clustering / recurring patterns belong in **ops analytics**; feeding conclusions back into gates = **human + PR**, not daemon.

---

## Analogy: training / serving stacks (informal)

| Common large-lab pattern | Alchemist analogue |
|--------------------------|-------------------|
| Offline eval metrics | `verify:harsh`, PNH simulation, `verify_post_summary` |
| Online serving metrics | RLL events → aggregates (this doc) |
| Safety policy layer | TS gates + HARD GATE + no shadow governance |
| Human oversight on policy change | `igor:apply`, code review, versioned thresholds |

This table is **analogy only** — Alchemist is a **product TS stack**, not a foundation model trainer.

---

## Patch checklist for implementers

1. Emit `logRealitySignal` from web/mobile/bridge at real user decision points (after consent / product spec).
2. Aggregate in your log pipeline into `RealityGroundTruthAggregate` if you want SOE message enrichment.
3. Do **not** wire aggregates into `scoreCandidates` or `validate.ts` without a dedicated design review.
4. Extend **`docs/FIRE.md`** contract rows when RLL becomes a shipped product surface.

**Related:** `docs/FIRE.md` (index), `packages/shared-engine/soe.ts`, `telemetry.ts`, `telemetry-redact.ts`.
