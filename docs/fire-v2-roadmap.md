# FIRE v2 Roadmap (Public-Pattern Mapping)

This document maps Alchemist FIRE to **publicly visible** large-lab patterns and turns that into a practical roadmap. It does **not** claim access to private internal architectures.

## 1) Architecture map (public-pattern lens)

- **Auditable control surfaces:** FIRE already has strong explicit boundaries: `verify_post_summary`, HARD GATE, no shadow governance, and typed route/gate contracts.
- **Triad as orchestration substrate:** triad panel diversity improves robustness and failure containment; it does not by itself guarantee truth/alignment.
- **Gates as eval/safeguard layer:** Undercover/Slavic and verification suites act like application-level evals and safety checks.
- **SOE as guidance layer:** SOE is useful and honest, but mostly advisory today.
- **Primary gap:** first-class **real-world outcome loop** (what got used, edited, discarded, and reused).

## 2) FIRE v2 intent

Core shift:

> Reject vanity metrics. Keep consequence metrics.

Target properties:

1. Preserve current integrity model (HARD GATE, no shadow governance, auditable logs).
2. Add outcome-grounded learning signals without implicit policy mutation.
3. Keep all adaptation bounded, reviewable, and reversible.

## 3) Phase roadmap

## Phase 1 — Reality Loop Layer

- Establish explicit outcome events and contracts.
- Normalize rollups for operator visibility and SOE hints.
- Keep this layer observational by default.

## Phase 2 — Three eval lanes

- **Lane A (structural):** typecheck, gates, verify, policy checks.
- **Lane B (behavioral):** human preference/use patterns.
- **Lane C (outcome):** downstream workflow impact.

## Phase 3 — Bounded adaptation

- SOE proposes bounded policy deltas.
- Human approval first; repeated approved moves can become auto-eligible only within explicit limits.
- Every application logged and reversible.

## Phase 4 — Tablebase with provenance

- Add success/failure counters, reuse signals, context tags, revalidation metadata.
- Keep tablebase updates explicit and auditable.

## Phase 5 — Explore / exploit / safe policy modes

- Add explicit runtime policy mode as typed config.
- `explore` favors novelty, `exploit` favors known-good, `safe` enforces strongest conservatism.
- Any gate-threshold change remains reviewed code, never implicit mode side effect.

## Phase 6 — Deployment tiers

- Define tiered rollout states (`lab`, `trusted`, `bounded_public`, `broad`).
- Tie each tier to allowed actions, monitoring, rollback posture, and export authority.

## Phase 7 — Failure intelligence

- Introduce structured failure taxonomy and clustering.
- Feed aggregate failure classes into review queues for SOE/gates/tablebase.
- Keep decisions human-governed unless explicitly codified.

## 4) One-screen architecture

```text
User / Workflow
   ↓
Intent + Context
   ↓
Triad Orchestration
   ↓
Candidate Gates
   ↓
Selection / Arbitration
   ↓
Action / Export / Share
   ↓
Reality Loop
   ├─ usage signals
   ├─ human edits
   ├─ downstream success/failure
   └─ rollout telemetry
   ↓
SOE / Governance
   ├─ eval updates
   ├─ tablebase updates
   ├─ bounded adaptation proposals
   └─ deployment tier decisions
```

## 5) Suggested metric classes

- **Integrity:** did the system obey gates/policy?
- **Usefulness:** was output used?
- **Flourishing:** did it reduce drudgery / increase leverage?
- **Safety:** did it avoid harmful/misleading failure modes?

## 6) Repo-facing patch hints

- Extend `verify_post_summary` with outcome rollups (`adoptionRate`, `discardRate`, etc.).
- Add outcome telemetry contracts and emission points.
- Add `failure-taxonomy` + bounded-adaptation proposal surface.
- Extend tablebase metadata with provenance and revalidation fields.
- Add typed policy config for mode/tier.

## 7) Non-negotiables

- No shadow governance.
- No silent gate/weight mutation from telemetry.
- HARD GATE remains authoritative for `.fxp` integrity.
- All adaptation is explicit, reviewable, and reversible.

Related:

- `docs/FIRE.md`
- `docs/reality-loop-layer.md`
- `docs/iom.md`
