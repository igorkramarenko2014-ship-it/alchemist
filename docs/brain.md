# Alchemist — project brain (detailed)

**Role:** Single-file **deep orientation** for humans and LLMs when `FIRESTARTER.md` is too long and `FIRE.md` is too contract-heavy. It does **not** replace those files for **canonical** law or CI contracts.

**Truth hierarchy:** `docs/FIRESTARTER.md` (recovery + implementation narrative) → `docs/FIRE.md` (§E–§L, assessment) → this file → code.

---

## 1. What the product is

**Alchemist** turns a **natural-language prompt** (typed or spoken) into **Serum synthesizer preset candidates**, runs **TypeScript statistical gates**, ranks results, and can **export `.fxp`** in the browser when the Rust→WASM encoder is built and healthy.

- **Not in this monorepo:** a shipping **JUCE/AU/VST3 DSP plugin** as the main artifact. The **web + packages** path is **NL → candidates → rank → optional WASM `.fxp`**. A **`vst/`** folder exists mainly as a **Cursor workspace slice** that forwards scripts to the real repo root.

- **Design:** dark-first UI (`#111827`, `#5EEAD4`), sharp geometry, fail loudly.

---

## 2. Monorepo map (what lives where)

| Path | Purpose |
|------|---------|
| `apps/web-app` | Next.js 14 App Router, Mercury orb, PromptAudioDock, `/api/triad/*`, `/api/health/*` |
| `packages/shared-types` | Schemas: `Panelist`, `AICandidate`, `SerumState` skeleton, etc. |
| `packages/shared-engine` | `runTriad`, gates (`validate.ts`, `score.ts`), encoder glue, Vitest, taxonomy / optional arbitration, SOE, telemetry |
| `packages/fxp-encoder` | Rust → wasm-pack; **`serum-offset-map.ts`** (HARD GATE) |
| `packages/shared-ui` | Shared React UI |
| `apps/mobile-app` | Expo (optional; not in default typecheck filter) |
| `tools/` | `validate-offsets.py`, optional `sample_init.fxp` |
| `scripts/` | `with-pnpm.mjs`, `run-verify-with-summary.mjs` (`verify_post_summary`), `sync-fire-md.mjs`, doctor, gate calibration, etc. |
| `research/` | Optional Python / CV–OSC experiments — **not** part of default verify |
| `vst/` | Thin package.json forwarding to root `pnpm` |

**Package manager:** `pnpm` workspaces. **Node ≥ 20.**

---

## 3. End-to-end data flow (web)

1. User prompt → **`validatePromptForTriad`** (max length, no markdown fences).
2. **Triad:** parallel calls to **`/api/triad/llama`**, **`deepseek`**, **`qwen`** (live **fetcher** when API keys set; else **stub**). Optional **keyword tablebase** can short-circuit fetches.
3. **`runTriad`** merges panelists → **`filterValid`** → **Undercover**-style distribution / adversarial checks → up to **8** candidates (cosine dedupe is **not** here; see below).
4. Client **`scoreCandidates`:** **`filterValid`** (e.g. **reasoning** length ≥ **15** chars) → **Slavic** dedupe (param cosine **> 0.80**; with legible text also **Dice(bigram) > 0.75** on `description` || `reasoning`) → weighted order.
5. UI: Mercury / dock; **export** via **`encodeFxp`** when **`GET /api/health/wasm`** reports **`available`**.

**Telemetry:** structured **`logEvent`** lines on stderr (`triad_run_*`, `triad_panelist_end`, etc.). **Greek codenames** in UI/logs (ATHENA / HERMES / HESTIA) map to wire IDs **DEEPSEEK / LLAMA / QWEN**.

---

## 4. HARD GATE (encoder / Serum bytes)

No authoritative **Serum byte layout**, **`.fxp` generation**, or **placeholder offsets** without:

1. **`packages/fxp-encoder/serum-offset-map.ts`** present and consistent with  
2. **`tools/validate-offsets.py`** run against a **real Serum init `.fxp`**.

Release-style checks: **`pnpm validate:offsets`**, **`pnpm assert:hard-gate`**, **`ALCHEMIST_STRICT_OFFSETS=1`** when the sample must exist.

---

## 5. Gates = TypeScript statistics (not analog DSP)

- **Undercover CAI** (~`validate.ts`): distribution / variance / entropy-style **statistical** behavior on candidates — **not** a saturator plugin.
- **Slavic filter** (~`score.ts`): cosine on params + text dedupe — **not** resonant VST filtering.

Do not describe these as **AU/VST audio processors** in product copy. See **`.cursor/rules/alchemist-dsp-vs-ts-gates.mdc`**.

---

## 6. Triad panelists (wire contract)

| Panelist | Weight | Route |
|----------|--------|-------|
| DEEPSEEK | 0.40 | `/api/triad/deepseek` |
| LLAMA | 0.35 | `/api/triad/llama` |
| QWEN | 0.25 | `/api/triad/qwen` |

**Env (live fetcher):** `DEEPSEEK_API_KEY`, `QWEN_API_KEY` (+ optional `QWEN_BASE_URL`), `GROQ_API_KEY` or `LLAMA_API_KEY` (+ optional `LLAMA_GROQ_MODEL`). **Timeouts:** default **8s** per panelist server-side; client timeouts include longer Qwen path — see `FIRESTARTER` §5b.

**Governance weights** (telemetry scoring, not panelist blend): **45% / 35% / 20%** fidelity / velocity / frugality — `triad-panel-governance.ts`.

---

## 7. WASM / browser `.fxp`

- Build: **`pnpm build:wasm`** in `packages/fxp-encoder` (Rust + wasm-pack → `pkg/`).
- Health: **`GET /api/health/wasm`** must return **`available`** for UI to enable export.
- **`harshcheck`** can pass **without** Rust (stub path); **browser export** needs WASM built.

---

## 8. Verification & hygiene (commands)

| Goal | Command |
|------|---------|
| Fast CI loop (no Next production build) | **`pnpm verify:harsh`** |
| Pre-ship (+ `next build`) | **`pnpm harshcheck`** |
| Env / workspace doctor | **`pnpm alc:doctor`** |
| Refresh **FIRE.md** + **brain-plus** metrics block | **`pnpm fire:sync`** (requires green **`shared-engine`** Vitest) |
| Optional auto-sync metrics after green verify | **`ALCHEMIST_FIRE_SYNC=1`** with harsh verify |
| Triad key smoke | **`pnpm verify:keys`** |
| Gate calibration vs live routes | **`pnpm test:real-gates`** (local artifact gitignored) |
| Denylist / transparency scan | **`pnpm check:transparent`** |

**Auditable stderr:** **`verify_post_summary`** JSON after verify scripts; **`soeHint`** when present.

---

## 9. Optional advanced modules (not required for MVP understanding)

- **Arbitration:** `runTransparentArbitration` — see `FIRE.md` §I, `packages/shared-engine/arbitration/`.
- **Talent market scout:** `talent/` — §J.
- **Great Library / AGL:** offline provenance merges into SOE snapshot — §K, `learning/great-library.ts`.
- **Taxonomy:** sparse rank + pool size limits — `taxonomy/`, `FIRESTARTER` §13 notes.

All stay **explicit** and **auditable** — no shadow governance.

---

## 10. Legal & security pointers

Canonical summary: **`FIRESTARTER.md` §14**. Full prose: root **`LEGAL.md`**, **`LICENSE`**, **`SECURITY.md`**, **`PRIVACY.md`**. Trademarks (Serum / Xfer) and provider ToS matter for shipping.

---

## 11. New agent / developer bootstrap

1. Open repo root (folder with **`apps/`** and **`packages/`** — not an empty `vst/` stub).
2. **`pnpm install`**
3. **`pnpm alc:doctor`**
4. **`pnpm env:check`** (web-app `.env.local` format)
5. **`pnpm check:ready`** or **`pnpm verify:harsh`**
6. **`pnpm dev`** — use the URL printed by **`dev-server.mjs`** (port scan), not a fixed `:3000` assumption.
7. Read **`docs/FIRESTARTER.md`** Appendix B if you need the INIT paste block.

---

## 12. Related files

- **Outside assessment shell (minimal + auto metrics):** `docs/brain-plus.md`
- **Contracts & §E suggest loop:** `docs/FIRE.md`
- **Full recovery bible:** `docs/FIRESTARTER.md`
- **Cursor / agents:** `AGENTS.md`, `.cursorrules`, `.cursor/rules/alchemist-*.mdc`
- **Optional voice / brainstorm tone (Cursor skill, not product law):** `.cursor/skills/inner-circle-voice/SKILL.md` (+ `reference.md` for merge notes). Adjusts collaboration framing only — **does not** override HARD GATE, types, or security.

---

## 13. Brain doc maintenance

- **`brain-plus.md` machine block:** never hand-edit between **`ALCHEMIST:BRAIN_PLUS_METRICS`** markers — **`pnpm fire:sync`** (§8).
- **`brain-plus.md` § Human deltas:** edit manually per release or before external review.
- **This file (`brain.md`):** narrative orientation only; law stays **`FIRESTARTER.md`** / **`FIRE.md`**.

---

## 14. Agent thinking (trusted-peer merge)

**What this is:** A **non-contract** layer for **how** an assistant reasons **after** canon— distilled from long **trusted-peer** chat patterns (music, logistics, events, playful curiosity) and merged into **`.cursor/skills/inner-circle-voice/`**. It does **not** change **HARD GATE**, **verify** meaning, **triad** wiring, or **TS gate** facts.

**Thinking order (for humans + LLMs):**

1. **Truth / safety:** `FIRESTARTER` → `FIRE` → encoder gate → DSP-vs-TS boundaries.
2. **Task:** deliver what the user asked (code, spec, diagnosis).
3. **Tone (optional):** when the user is brainstorming, sparring, or in **confidant** mode—**short**, **direct**, **warm**; share **links and concrete refs** like a peer; **dry humor** OK if it does not obscure errors or consent; **admit limits** (“surface only,” “my edit isn’t done”) when that matches the thread.

**Merged motifs (abstract — no impersonation):** studio-friend **WIP sharing**; **schedule + work-constraint** realism; **social triangulation** only from facts the user gave; **event / live-plan** logistics as plain steps; **personality tests and riddles** as **conversation / self-insight only**, not hiring or product scoring.

**Sources of detail:** **`inner-circle-voice/SKILL.md`** (**Agent thinking anchor** + facets), **`inner-circle-voice/reference.md`** (export merge log, incl. batch **2026-03-23 (19)–(22)**).

**Ongoing:** When you **attach** new chat exports (paths or files), expect the agent to **merge** abstract patterns into **`reference.md`** and update **`inner-circle-voice/SKILL.md`** when needed—see **Standing instruction** in that skill. Canon (HARD GATE, verify) stays unchanged.
