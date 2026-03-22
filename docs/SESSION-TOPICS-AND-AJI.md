# Session topics + Go (Aji) logic — capture

**Purpose:** Durable notes from a multi-topic thread. **Not** canonical product law — see **`FIRESTARTER.md`** + **`FIRE.md`** for that.

---

## 1. What the project is (codebase)

- **Alchemist** — monorepo: NL **prompt** → **triad** (LLAMA / DEEPSEEK / QWEN) → up to **8** **Serum** preset **candidates** → **gates** + **scoring** → optional **`.fxp`** (Rust→WASM encoder; **HARD GATE** on offset map + **`validate-offsets.py`**).
- **`packages/shared-engine`** — **`runTriad`** vs **`scoreCandidates`**, constants, validate/score/governance/telemetry. **Exact behavior:** **`FIRESTARTER.md` §5b**.
- **`vst/python-bridge/bridge.py`** — JSON-RPC (ping, generate stubs, load_to_serum, shutdown). **`PROTOCOL.md`**.

---

## 2. “Jackpot Hacker” (your framing, not the repo’s official name)

- Vision: Logic Pro / **Serum** workflows, MIDI CC / automation, **“fluid mercury”** UI.
- **Three tasks** discussed (product design, not all shipped): **Jackpot** trigger/randomization, **Hacker** parameter override path, **mercury** UI component.
- **Clarification:** The shipped engine is **preset generation + ranking + FXP**, not a literal “jackpot / casino” RNG unless you build that layer on top.

---

## 3. Go-inspired **Aji** mindset (strategy, not Go code)

**Goal:** Place **few stones** for **maximum structural pressure** (leverage).

**Three “pressure points” in any script/system:**

| Lens | Idea |
|------|------|
| **Recursive loop / feedback** | Find self-calls or re-evaluation loops; **small change** to exit condition or weight at the **pivot** ripples through execution. |
| **Data bottleneck / squeeze** | Where many options collapse to one decision; **change filter criteria** to redirect flow without rewriting the whole engine. |
| **Edge-case Aji** | The **1%** path; algorithms optimize the 99%; **exceptions** are where latent leverage or breakage lives. |

**Scripting steps:**

1. **Win condition** — what counts as success (e.g. right trigger, right override, right export).
2. **Liberties** — where the system is allowed to vary (thresholds, filters, timeouts, which params are touched).
3. **Stone** — one change **where liberties meet** the win condition (single pivot).

**Golden Thread (First Transmutation):**  
**Input** → **decision** (Jackpot? override? which preset?) → **output** (Serum/Logic state). The “transmutation” is changing the **rule at the decision**, not only inputs/outputs.

---

## 4. Docs / artifacts from the thread

| Artifact | Role |
|----------|------|
| **`docs/PROJECT-SCRIPTS-PURITY-BUGS-IMPROVEMENTS.md`** | Scripts inventory, **purity** definition, bugs/suspects, improvements — for **external LLMs / auditors**. |
| **`docs/FIRESTARTER.md` §5b** | **Implementation truth** for `shared-engine` (pipelines, numbers, modules). |
| **`docs/README.md`** | Points readers at **§5b**. |

---

## 5. Misc from the thread

- **Fork chat** — new branch of conversation from a snapshot; explore without derailing the main thread.
- **“Still won’t run”** — needs **command + full error output** to debug (not resolved in thread).

---

*If you want this enforced for agents, add a short pointer in **`.cursor/rules/`** or **`AGENTS.md`** to this file or to **§5b** + **FIRESTARTER**.*
