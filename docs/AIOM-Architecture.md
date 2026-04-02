# AIOM 2-Layer Architecture
## Logical Integrity vs. Environment Hardening

"An AI that is not only intelligent, but honest enough to refuse — and hardened enough to prove it."

---

### 1. The Core Insight
AIOM separates **Logic Integrity** from **Environment Integrity**. They are solved separately and combined deliberately.

- **Layer 1 (Core)**: Solves for "Is the brain honest?".
- **Layer 2 (Hardened)**: Solves for "Can the environment lie about the brain?".

---

### 2. The Two Layers

| Property | Layer 1 — CORE (Phase 1) | Layer 2 — HARDENED (Phase 2) |
| :--- | :--- | :--- |
| **Goal** | Detect drift, hallucination | Cryptographic proof of integrity |
| **Environment** | Trusted operator loop | Semi-hostile, multi-tenant |
| **Speed** | Fast (runs every verify) | Moderate (signing + timestamp) |
| **Hardness** | 6/10 | 8/10 |
| **Schema** | v4 | v5 |
| **Guarantees** | Probabilistic signals | Verifiable, signed, reproducible |

---

### 3. Layer Composition

| Concern | Layer 1 Core | Layer 2 Hardened |
| :--- | :--- | :--- |
| **Logic Integrity** | MON derivation, drift detection | Inherited from Core |
| **Artifact Freshness** | Sequence counter, nonce | Roughtime external timestamp |
| **Binary Integrity** | SHA-256 hash check | Pinned runner hash + attestation |
| **Execution Proof** | Audit log to stderr | Signed hash chain + trace |
| **Independent Verify** | Manual jq checks | `node verify-artifact.mjs` |
| **Clock Trust** | Local monotonic counter | Roughtime (external authority) |
| **Key Material** | None | Ed25519 keypair (operator-managed) |

---

### 4. Use Cases

#### Core (Layer 1)
- **Field medical diagnostics**: Drift detection to prevent patient risk.
- **Evacuation route planning**: Ensure priority orders do not permute.
- **Humanitarian triage**: Prevent symptom weight decay.

#### Hardened (Layer 2)
- **External Audit**: Independent verification of system state.
- **Multi-tenant deployment**: Cross-tenant tamper protection.
- **Untrusted Agents**: Prevent forgery of MON or integrity scores.

---

### 5. Roadmap
- **Phase 1 (CORE)**: COMPLETED. 5 failure modes fixed, schema v4.
- **Phase 2 (HARDENED)**: IN PROGRESS. Trustless stack: chain + signer + roughtime.
- **Phase 3+**: HSM / TEE (Optional). Only for nation-state threat models.

---

*Alchemist Project — Product Architecture Document*
*CONFIDENTIAL — Not for external distribution*
