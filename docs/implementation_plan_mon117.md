# Implementation Plan — Alchemist MON 117: Miltech Integrity (Capability Guard & Sentinel)

This plan transmutates the Alchemist Brain into a high-integrity, mission-critical core. We are implementing the **Capability Expansion Guard (AST-Based)** and the **Quantum Sentinel (Memory Stickiness)** according to the "Production-Ready" Miltech specifications.

## User Review Required

> [!IMPORTANT]
> **Dependency Addition**: We must add `@babel/parser`, `@babel/traverse`, and `@babel/types` to the root `devDependencies`.
> **WASM Hardening**: `packages/fxp-encoder/src/lib.rs` will be modified to export a deterministic state hash. A full `pnpm build:wasm` is required.
> **Enforcement Level**: Memory stickiness check (`Quantum Sentinel`) will be wired into `verify:harsh`. Any drift will fail the build.

## Proposed Changes

### [Phase 1] Capability Expansion Guard (AST-Gated)
Implement the "Default Deny" contract using Babel AST analysis.

#### [NEW] [root.capabilities.json](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/capabilities/root.capabilities.json)
- Define `version 1.0` manifest: endpoints (`GET /health`, `POST /api/v1/submit`), `wasmAccess` (`readOnlyMemory`), and `allowedFailureModes`.

#### [NEW] [capability-detector.mjs](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/scripts/capability-detector.mjs)
- AST-based detector for `app.get`, `router.post`, `WebAssembly.*` calls, and `ThrowStatement` modes.

#### [NEW] [verify-capabilities.mjs](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/scripts/verify-capabilities.mjs)
- Compare `git diff origin/main...HEAD` findings against the manifest.
- Support PR-level bypass with the `allowed-capability-expansion: true` flag.

---

### [Phase 2] Quantum Sentinel (Live Memory Integrity)
Protect against "Heisenberg Echo" (memory drift) using multi-worker stress checks.

#### [MODIFY] [lib.rs](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/fxp-encoder/src/lib.rs)
- Export `get_internal_state_hash` using `wasm_bindgen` for real-time memory verification.

#### [NEW] [sentinel.ts](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/packages/shared-engine/security/sentinel.ts)
- `verifyLiveBufferSync`: Constant-time comparison of runtime WASM hash with `truth-matrix.json`.

#### [NEW] [validate-memory-stickiness.mjs](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/scripts/validate-memory-stickiness.mjs)
- 8-worker stress test using `Worker` and `Atomics` to provocatively check for memory race windows and drift.

---

### [Phase 3] Integration & System Hardening

#### [MODIFY] [package.json (root)](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/package.json)
- Add `verify:capabilities` and `verify:sentinel`.
- Update `verify:harsh` to include these new checks.

#### [MODIFY] [route.ts (health)](file:///Users/igorkramarenko/Desktop/Vibe%20Projects/apps/web-app/app/api/health/route.ts)
- Wire `X-AIOM-Integrity-Live: enforce` support to trigger Sentinel verification on `truth-matrix` requests.

## Open Questions

- **WASM Hash Algorithm**: Should we use SHA-256 for the state hash, or a faster deterministic XOR sum as an initial baseline? (SHA-256 preferred for "Miltech").
- **CI Environment**: Verifying if the GitHub runner has `git` and local `origin/main` for diffing.

## Verification Plan

### Automated Tests
- `pnpm verify:capabilities` (Local file mutation test).
- `pnpm verify:sentinel` (Stress test with 8 workers).
- `pnpm verify:harsh` (Full suite check — 117_STABLE target).

### Manual Verification
- Verify `pnpm alc:doctor` still reports nominal.
- Check `GET /api/health` with the integrity header to ensure Sentinel detects (or doesn't) simulated drift.
