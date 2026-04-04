# ADR 001: Shigor Determinism Boundary

## Context
AIOM v2 requires a trustless, verifiable execution environment. To achieve this, the core decision-making logic must be strictly deterministic, allowing for byte-identical re-execution on any machine (Node.js or Rust-based runner).

## Status
**ACCEPTED**

## Boundary Definition

### 1. Pure Core Zone (Deterministic)
The following files in `packages/shared-engine/operator/` are designated as the **Pure Core**. They must contain no non-deterministic side-effects and must not depend on the host environment directly.

- [shigor-core.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/operator/shigor-core.ts)
- [operator-resonance.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/operator/operator-resonance.ts)
- [operator-types.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/operator/operator-types.ts)
- [operator-id.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/operator/operator-id.ts)

### 2. Nondeterministic Host Adapter
The following files act as the bridge between the nondeterministic environment (clock, network, file system) and the Pure Core.

- [operator-shard-manager.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/operator/operator-shard-manager.ts)

## Enforcement Rules

1.  **Data In/Out**: The Pure Core must accept state and signals as plain data objects and return decisions as plain data objects.
2.  **Prohibited APIs**:
    - No `fs`, `path`, `os`, or `process`.
    - No `Date` or `performance.now()`.
    - No `Math.random()` or `crypto.randomUUID()`.
    - No `setTimeout` or `setInterval`.
3.  **No Environment Access**: Reading environment variables (`process.env`) is forbidden within the decision path.
4.  **Stable Serialization**: The output must be serializable into a byte-identical payload (e.g., via canonical JSON stringify).

## Verification
Enforcement is verified by:
- `scripts/check-determinism.mjs` (static scan).
- `packages/shared-engine/tests/determinism-purity.test.ts` (dynamic 100-run stability test).
