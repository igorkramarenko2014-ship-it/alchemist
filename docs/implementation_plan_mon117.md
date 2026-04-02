# Implementation Plan — Alchemist MON 117: Hardening & Observability (Phase 0-2)

This plan transmutates the Alchemist Brain from a "clean creative tool" to a "high-integrity mission-critical core" by focusing on mechanical enforcement and observable influence. We follow the user's "Blunt Recommendation" for a realistic maturity roadmap.

## User Review Required

> [!IMPORTANT]
> **Pivot**: We are deprioritizing the Phase 3 "Quantum Sentinel" (memory drift) in favor of Phase 0/1 **Influence Visibility** and **Priors Non-Regression**.
> **Visibility**: `/api/health` will now expose `priorsStatus` and `influenceSummary`.
> **Enforcement**: Mechanical Aji enforcement (Locks 1-5) will be built into the scoring pipeline.

## Proposed Changes

### [Phase 1] Monitoring & Observability (High Leverage)
Make influence observable and accountable.

#### [MODIFY] [integrity.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/integrity.ts)
- Add `influenceSummary` to the health snapshot.
- Include `priorsStatus` (staleness, weight, count).

#### [MODIFY] [route.ts (health)](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/apps/web-app/app/api/health/route.ts)
- Surface `influenceSummary` and `priorsStatus` in the 117_STABLE payload.

#### [MODIFY] [telemetry.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/telemetry.ts)
- Add `triad_run_influence` log event: which priors were used, confidence delta, and staleness penalty.

---

### [Phase 2] Mechanical Alignment (Locks 1-5)
Move from advisory to mechanical Aji enforcement.

#### [MODIFY] [score.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/score.ts)
- Implement trigger limits and advisory banners based on Aji pressure.
- Enforce Lock 1-5 invariants programmatically during `scoreCandidates`.

#### [NEW] [priors-non-regression.test.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/tests/priors-non-regression.test.ts)
- A "Proof-of-Value" test: run a baseline prompt set, ensure new priors/logic do not regress the score vs a deterministic seed.

---

### [Phase 3] Capability Expansion Guard (Safety Baseline)
Maintain the "Default Deny" contract via AST analysis.

#### [NEW] [root.capabilities.json](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/capabilities/root.capabilities.json)
- Explicit allowlist of endpoints and WASM levels.

#### [NEW] [verify-capabilities.mjs](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/scripts/verify-capabilities.mjs)
- AST-gated build check (already partially implemented).

## Open Questions

- **Non-Regression Baseline**: Should we store the "Gold Standard" baseline in `artifacts/priors-baseline.json`?
- **Staleness Penalty**: Current plan is a linear decay after 7 days; is this aggressive enough for high-stakes domains?

## Verification Plan

### Automated Tests
- `pnpm test:engine:priors-non-regression`
- `pnpm verify:capabilities`
- `pnpm verify:harsh` (117_STABLE target)

### Manual Verification
- Check `GET /api/health` to confirm `influenceSummary` reflects recent triad runs.
- Attempt an unauthorized endpoint addition and verify build failure.
