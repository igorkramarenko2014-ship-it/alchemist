# Integrity Locks Manifest (MON 117 Hardening)

This document defines the canonical integrity enforcement model for the Alchemist Engine, transitioning signals from "presentation-time truth" to "engine truth."

## 1. Canonical Lock Reason Codes

These codes are stable and used across telemetry (`triad_run_influence`), health snapshots, and internal engine logic.

| Lock ID | Rationale Code | Severity | Description |
| :--- | :--- | :--- | :--- |
| **Lock 1** | `CONSENT_LACKING` | **CRITICAL** | User consent missing or revoked. Triggers `creativePivot`. |
| **Lock 2** | `EXECUTION_GATE_CLOSED` | **CRITICAL** | System execution prevents AI action (Gate closed). Triggers `creativePivot`. |
| **Lock 3** | `EPISTEMIC_BRAKE_ACTIVE` | **ADVISORY** | High uncertainty or gap detected. Forces `deferTruth` and slows pacing. |
| **Lock 4** | `HUMAN_PRIORITY_OVERRIDE` | **ADVISORY** | Fragility detected in human resonance. Biases lead to Svitlana (Calibration). |
| **Lock 5** | `HARM_GATE_TRIPPED` | **CRITICAL** | GFUSC safety violation detected in context or candidates. |

## 2. Precedence Order (Deterministic)

Locks are evaluated in a fixed, hierarchical order. A higher-priority lock "masks" lower-priority signals to ensure deterministic safety outcomes.

1.  **Consent (Absolute)**: If `consentLocked: false`, all other logic is bypassed.
2.  **Execution Gate**: If `executionGateOpen: false`, execution stops regardless of human priority.
3.  **Epistemic Brake**: Evaluated before human bias to ensure truth is deferred if uncertain.
4.  **Human Priority**: Shapes the delivery/persona once safety gates are passed.
5.  **Harm Gate**: Final validation layer for content and intent.

## 3. Pure-Core Enforcement Zone

The following files constitute the **Pure Core** where mechanical determinism is enforced. No external API logic or non-deterministic side-effects are allowed in this zone.

- [integrity.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/integrity.ts) — Canonical state and lock evaluation.
- [score.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/score.ts) — Gated scoring pipeline and `creativePivot` enforcement.
- [operator/shigor-core.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/operator/shigor-core.ts) — Sovereign decision integration.
- [validate.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/validate.ts) — Structural and adversarial validation.
- [aji-logic.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/aji-logic.ts) — Deterministic crystallization logic.

## 4. Mechanical Hard-Gate Logic

When a **Hard Gate** (Lock 1 or 2) fails, the engine enforces a **Creative Pivot**:
- All AI candidates are discarded.
- A deterministic "dead-end" entropy state is generated.
- Telemetry reflects the specific lock failure, not an "AI failure."
