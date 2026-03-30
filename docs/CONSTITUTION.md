# Alchemist System Constitution

**Status:** Canonical Principles (**Prompt H**)  
**Last Updated:** 2026-03-30  
**Authority:** Highest Principle

This document formalizes the immutable architectural laws of Project Alchemist. It ensures long-term integrity, prevents "shadow governance," and anchors the system against conceptual or technical drift.

---

## 1. Authority Hierarchy

The system operates under a strict hierarchy of authority. Lower layers cannot override, influence, or bypass higher layers.

1. **Law** (Hard Authority: WASM, Offsets, TS Gates, CI)
2. **Verification** (`pnpm verify:harsh`, `identity:sync`, `pnpm harshcheck`)
3. **Truth Artifacts** (`truth-matrix.json`, `fire-metrics.json`, `sha256` chain)
4. **Signals** (Engine School, `learningOutcomes`, Aji insights, priors)
5. **UI / Outputs** (Mercury Orb, Preset Share, Logs)

---

## 2. Law vs. Signal (Enforced Boundary)

The system maintains an absolute, mechanically enforced boundary between **Law** and **Signal**.

### **Law (Hard Authority)**
- **Definition:** Code, gates, and verification scripts that determine state, integrity, and operating readiness.
- **Components:** Hard Gates (`serum-offset-map.ts`), TS Gates (`Undercover`, `Slavic`), `MON` (Minimum Operating Number), and CI enforcement.
- **Constraint:** Law is enforced by the codebase and CI. It is binary and definitive.

### **Signal (Non-Authoritative)**
- **Definition:** Observational data, learned patterns, and advisory insights that inform interpretation but lack authority.
- **Components:** `learningOutcomes`, Engine School corpus, Aji insights, and metadata priors.
- **Constraint:** Signals are observational and non-binding.

> [!IMPORTANT]
> **Cardinal Invariant:** No signal may directly or indirectly alter law. Signals are mechanically prevented from mutating gate thresholds, bypassing verification, or affecting the Minimum Operating Number (MON).

---

## 3. Non-Authority of Learning

The **Engine School** (Learning Corpus) is purely advisory. Its presence or absence has zero impact on core system integrity.

- **Isolation:** `learningOutcomes` and corpus signals do not affect `MON`.
- **Non-Authoritative:** Learning data does not affect `integrityStatus` or gate outcomes.
- **Fail-Safe:** A complete failure or corruption of the learning corpus cannot cause a legitimate technical pass or fail in the core product layer.

---

## 4. No Shadow Governance

The system prohibits all forms of "Shadow Governance," "Amnesia," or "KGB stacks."

- **Forbidden:** No hidden states, no runtime-only decision memory, no unlogged influences, and no implicit coupling.
- **Requirement:** Every scoring decision, ranking shift, or state change must be derivable from committed artifacts and auditable telemetry logs.
- **Transparency:** All influence must be explicit. There are no "hidden inputs" to the AI triad or the gatekeepers.

---

## 5. No Amnesia

System truth is durable and reconstructible. 

- **Traceability:** If it cannot be reconstructed from committed artifacts, it is not part of the system.
- **Integrity Chain:** The truth matrix is protected by a `sha256` chain and periodic `fire:sync` operations.
- **Persistence:** Volatile runtime state is secondary to the committed truth surface.

---

## 6. Corpus Purity

The learning corpus is the system’s perceptual basis set. It must remain free of synthetic or inferred pollution.

- **No Hallucination:** Every lesson in the corpus must have a verified operator-grounded causal chain.
- **No Visual Bias:** Visual inferences (from Serum UI) are secondary to auditory confirmation (Ear-Pass).
- **Operator Authority:** Preserves raw operator wording and findings.
- **Fail-Closed Ingestion:** Ingestion must fail if the causal reasoning is missing or non-grounded.

---

## 7. Determinism & Reproducibility

The system ensures that given the same inputs (code, configurations, and artifacts), the same truth artifacts are produced.

- **Sync Requirements:** `identity:sync` and `fire:sync` ensure that documentation and internal state remain in lockstep.
- **Verification Parity:** Local `verify:harsh` results must match CI results.

---

## 8. Single Source of Truth

- **Authoritative Source:** `artifacts/truth-matrix.json` is the canonical state for system integrity.
- **Derived Docs:** Documentation (including `FIRE.md` and `FIRESTARTER.md`) is derived from or pointed at the truth artifacts, not the other way around.
- **Runtime Sync:** Runtime endpoints must reflect the state of committed artifacts, ensuring no drift between "Repo Truth" and "Running Truth."
