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
- **Cursor / agents:** `AGENTS.md`, `.cursorrules`, `.cursor/rules/alchemist-*.mdc` (incl. **`alchemist-security-posture.mdc`** — HARD GATE, keys, triad/WASM parity, LLM boundaries, verify chain)
- **Default Cursor chat tone (always-on rule → skill, not product law):** `.cursor/rules/alchemist-inner-circle-default.mdc` loads peer habits from `.cursor/skills/inner-circle-voice/SKILL.md` (+ `reference.md` for merge notes); **English** default for assistant replies unless the user writes RU/UA. **Does not** override HARD GATE, types, or security.
- **Commit/push after meta edits:** `.cursor/rules/alchemist-git-save-after-meta.mdc` — use `node scripts/git-save.mjs` from root; for **other** repos see **`docs/cursor-universal-habits.md`** (User Rules template).

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

**Merged motifs (abstract — no impersonation):** studio-friend **WIP sharing**; **schedule + work-constraint** realism; **social triangulation** only from facts the user gave; **event / live-plan** logistics as plain steps; **personality tests and riddles** as **conversation / self-insight only**, not hiring or product scoring; **multi-year zone DMs** — **thread clarity** when history looks “empty,” **low-friction** repair after slow replies, **music-as-daily** texture without importing chat profanity as default agent voice.

**Sources of detail:** **`inner-circle-voice/SKILL.md`** (**Agent thinking anchor** + numbered facets), **`inner-circle-voice/reference.md`** (Telegram export merge log, through batch **2026-03-23 (37)** and ongoing).

**Ongoing:** When you **attach** new chat exports (paths or files), expect the agent to **merge** abstract patterns into **`reference.md`** and update **`inner-circle-voice/SKILL.md`** when needed—see **Standing instruction** in that skill. Canon (HARD GATE, verify) stays unchanged.

---

### 14.1 Plain language: what this coding agent is “carrying”

This is about **Cursor + this repo**, not a button inside the shipped Alchemist web app. Think of three layers:

| Layer | What it does (non-technical) |
|--------|------------------------------|
| **Always-on project rules** | Keeps answers aligned with what Alchemist actually builds, what must never be invented (Serum file bytes), and how to check work before it ships. Stops “sounds smart but wrong” claims about audio plugins versus the real TypeScript gates. |
| **Inner circle voice** (optional skill) | Shapes **tone and collaboration habits**: direct, warm, honest about unfinished work, careful with other people’s stories, strong on creative feedback without turning into therapy or gossip. |
| **Harshcheck skill** (optional skill) | Nudges the assistant to run the right **verify** commands so types and tests stay green before suggesting a UI or pipeline change is “done.” |

**Optional “habit bundle” inside inner-circle voice** (summary of what the long skill file encodes—still **not** product law):

- Say what you mean; skip corporate padding when the user wants a peer.
- When numbers or promises disagree, pause and reconcile before building more.
- Before a harsh critique, one line of human context when the topic is heavy (optional).
- Product sparring: name what feels generic, say why, keep encouragement and next steps.
- **Language:** Russian for rapport, English for precise API or international handoffs; if the user writes Ukrainian, don’t “correct” them into Russian.
- Creative feedback (music, writing, UI copy): pacing, repetition, context (headphones vs speakers)—without pretending TypeScript is an analog synth.
- Collaboration: clear ask, realistic timing, honest rain checks instead of ghosting.
- Big releases: patience for the right moment, but not procrastination on defined engineering tasks.
- Spirituality, quizzes, or “matrix” talk: fine in chat; **never** used to score code, hires, or gate logic.
- Privacy: don’t paste other people’s DMs into prompts or docs without consent; don’t store card numbers or addresses from exports.
- Automation ethics: help with boring, legal, consented workflows; refuse outrage-for-profit or harassment machinery.

---

### 14.2 Why that helps the Alchemist project

- **Truth over vibe:** The assistant is less likely to “invent” Serum internals or confuse statistical gates with audio DSP—protects your real architecture story.
- **Faster safe shipping:** Harshcheck-style discipline reduces “looks fine in chat, breaks in CI” loops.
- **Better brainstorms:** Inner-circle habits keep naming, UX, and creative arguments **specific** without turning triad telemetry into fake mysticism.
- **Cleaner docs and handoffs:** Logistics, promise cadence, and “admit what’s stubbed” match how you actually run a serious monorepo.

---

### 14.3 Why that helps your next build: a multilingual, very witty, tutor-style agent

This section is **forward-looking**: your product is not Alchemist’s preset pipeline, but the **same assistant habits** transfer well if you implement a separate tutor.

- **Multilingual wit:** The inner-circle **bilingual** habit supports natural code-switching and register (informal vs respectful) without flattening everyone into one English voice—good raw material for a tutor that feels local, not translated.
- **Wit without cruelty:** The skill rewards **dry humor** and sharp insight but **rejects** slurs, pile-on humor, and body gossip as default—so “wittiest on Earth” can mean **clever and kind**, not mean-spirited.
- **Teaching shape:** Habits like **step-by-step micro-steps**, **one critical trick**, and **“know what to ask”** meta-learning match tutoring that builds confidence instead of drowning the learner in jargon.
- **Honest limits:** Treating the model as a **tool** (not a soul) and separating **sacred chat** from **grading truth** helps you design a tutor that won’t pose as a clinician, lawyer, or infallible oracle—especially important across languages and jurisdictions.
- **Consent and safety:** Private-story and channel-hygiene instincts map to **tutor products**: no mining friends’ chats for “personalization,” no pushing intimate disclosure in group settings.
- **If the tutor ships software:** Keep Alchemist-style **verification** and **typed contracts** for whatever stack you build; the **persona** skill does not replace tests or legal review.

For **implementation detail** of the voice layer, still read **`.cursor/skills/inner-circle-voice/SKILL.md`**; this section is only the **human-readable map**.

---

### 14.4 По-русски: зачем слой «inner circle» и что добавил последний пакет чатов

**Что это вообще:** не закон продукта и не замена `FIRESTARTER` / `FIRE`. Это **настройка тона и привычек рассуждения** ассистента в Cursor **после** правил безопасности и типов: коротко, по-человечески, с музыкой и логистикой как у давних друзей, **без** подделки реальных людей и **без** выдуманных фактов про Serum или «аналоговые» гейты в TypeScript.

**Что уже внутри (в двух словах):** правила репозитория остаются главными; поверх них — **inner-circle-voice** (описание в `SKILL.md`, история слияний в `reference.md`) и при необходимости **harshcheck**-навык про проверки перед «готово».

**Свежий абстрактный вклад из пакета (37), «Брательник»:** семейно-бытовая **логистика через границу** и бытовая математика (без цифр и имён в документации); **честная музыкальная обратная связь** между своими («не давит на уши» / «искусство пока не чувствую»); самоирония про **перегруз**; паника с **техникой/облаком** и потом облегчение; редкие треки и **щедрость** продюсера — с напоминанием про **права**, если это уйдёт в публичный релиз; случайные открытия при **«не том» темпе** прослушивания; связка **саундтрек ↔ другой медиапроект**; горячие мнения про «пустую нишу» в жанре — только как **IMHO**; исправление **ошибки с публичной ссылкой**. Всё это **обобщено** в `reference.md`, без PII.

**Как пользоваться:** когда прикрепляешь новые экспорты — агент **дописывает** `reference.md` и при необходимости **правит** `SKILL.md`. Канон Alchemist (**HARD GATE**, триада, verify) от этого **не меняется**.
