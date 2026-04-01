# V4 Refinery Architecture

**Alchemist Engine Phase 2 Integration & Adversarial Benchmarking.**

## Lane A: Transmutation Phase 2 (Product Behavior)

The Transmutation Module is now wired into the **Scoring Pipeline** (`scoreCandidates`). It enables profile-aware dynamic weighting and gate offsets without mutating core Law.

### Key Components
- **`resolveTransmutation`**: Early resolution in `runTriad`. Maps user prompt/context to an advisory `TransmutationProfile`.
- **Profile-Aware Weighting**: `triad_weights` from the profile shift panelist influence (Hermes/Athena/Hestia) for a specific tone or genre.
- **Dynamic Gate Offsets**: `slavic_threshold_delta` and `novelty_gate_delta` allow for tighter or looser deduplication and novelty gates based on task type.
- **Fail-Open Design**: On resolution failure, the system falls back to `BASELINE_STATIC`.

## Lane B: Adversarial Benchmark (Testing Pressure)

The **Adversarial Benchmark** (formerly "Anton Index") defines the moving ceiling of observed adversarial capability. It is a **Signal-only** input used to scale testing and observation.

### High-Level Logic
- **`computeTopTalentBenchmark`**: Selects the highest-skill profile from the `adversarial_talents` registry.
- **`AdversarialEnvelope`**: Maps the benchmark's `SkillVector` to PNH intensity parameters:
  - `attackComplexity` [0,1]
  - `fuzzDepth` [0,2.0]
  - `promptVariance` [0,1]
- **Resilience Margin**: `systemResilienceScore - benchmarkSkill`. Used for roadmap prioritization and risk monitoring.

### Safety Invariants
- **Signal-only**: Benchmarks influence **testing intensity** (PNH) and **advisory strictness** (TBV) only. 
- **Law Separation**: Benchmarks CANNOT mutate `MON`, `integrityStatus`, or Law-layer pass/fail outcomes.

## Telemetry & Audit
- **Provenance**: PNH telemetry now includes benchmark ID and source type (`talent_profile`).
- **Traceability**: All scoring runs log the `resolved_profile` vs the `effective_config` actually applied (bounded).

---
*V4 Refinery finalized 2026-03-31 | MON=117 state verified.*
