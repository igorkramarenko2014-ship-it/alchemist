# Alchemist — project brain (detailed)

**Role:** Single-file **deep orientation** for humans and LLMs when `FIRESTARTER.md` is too long and `FIRE.md` is too contract-heavy. It does **not** replace those files for **canonical** law or CI contracts.

**Truth hierarchy:** `docs/FIRESTARTER.md` (recovery + implementation narrative) → `docs/FIRE.md` (§E–§L, assessment) → this file → code.

**Doc map (first-party markdown under `docs/`):**

| File | Role |
|------|------|
| **`FIRESTARTER.md`** | Recovery bible, workflow appendices, INIT paste |
| **`FIRE.md`** | Assessment contracts §A–L + **`pnpm fire:sync`** metrics |
| **`brain.md`** | This file — deep orientation, §9a fusion, §9c–§9d Igor / IOM |
| **`codex-narrative.md`** | Codex working narrative: current repo picture, recent safe changes, and session-close discipline |
| **`FIRE.md`** (Assessment snapshot + §N) | Outside-assessment shell + synced metrics (ex–Brain+) |
| **`docs/internal/inner-circle-agent.md`** | Full peer prompt + Canon FIREWALL (tone layer) |
| **`iom.md`** | IOM — §9c + §9d discipline, growth protocol, §9c.1 fast-path moves |
| **`iom-architecture.md`** | Auto-generated power-cell digest — **`pnpm igor:docs`** after **`igor-power-cells.json`** edits |
| **`Engine-School-Validation.md`** | Engine School **validation contract** (lesson schema **1.2**, optional **`cluster`**) + **§8** inference posture (Phase 2 **opt-in** triad context via **`ALCHEMIST_LEARNING_CONTEXT`**; **`triadSessionId`** correlation on triad routes; optional **`ALCHEMIST_LEARNING_TELEMETRY`** → **`engine_school_influence`**; Phase 3 fitness-aware **corpus affinity** when **`fitnessScore`** is present; offline **`pnpm learning:assess-fitness`**) |
| **`learning-fitness-implementation-roadmap.md`** | **Task / implementation prompt** — fitness v1→v3, aggregator → index → corpus affinity sequencing, tests, optional AIOM outcomes (non-authoritative); does **not** change gate law |
| **`cursor-universal-habits.md`** | Cursor User Rules template (any repo) + optional **Python token economy** block |
| **`.cursor/rules/alchemist-python-economy.mdc`** | **Local Python** (`~/alchemist-tools/`) for bulk JSON/fixtures — **zero LLM tokens** for generated blobs; separate from **`tools/validate-offsets.py`** (HARD GATE) and **`pnpm learning:*`** (Node) |
| **`alchemist-*.html`** | Composer / task prompt packs — index **`FIRESTARTER` §12** |

Web dev “won’t start” ladder: **`FIRE.md` §L** subsection *Web app not running*.

---

## 1. What the product is

**Alchemist** turns a **natural-language prompt** (typed or spoken) into **Serum synthesizer preset candidates**, runs **TypeScript statistical gates**, ranks results, and can **export `.fxp`** in the browser when the Rust→WASM encoder is built and healthy.

- **Not in this monorepo:** a shipping **JUCE/AU/VST3 DSP plugin** as the main artifact. The **web + packages** path is **NL → candidates → rank → optional WASM `.fxp`**. A **`vst/`** folder exists mainly as a **Cursor workspace slice** that forwards scripts to the real repo root.

- **Design:** dark-first UI (`#111827`, `#5EEAD4`), sharp geometry, fail loudly.

---

## 2. Monorepo map (what lives where)

| Path | Purpose |
|------|---------|
| `apps/web-app` | Next.js 14 App Router, Mercury orb, PromptAudioDock, `/api/triad/*`, `/api/health/*`, **`POST /api/presets/share`**, **`/presets/[slug]`** |
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
2. **Triad:** parallel calls to **`/api/triad/llama`**, **`deepseek`**, **`qwen`** (live **fetcher** when API keys set; else **stub**). Each route uses **`triadPanelistSystemPrompt`** — includes **Panelist DNA** (distinct emphasis per **DEEPSEEK / LLAMA / QWEN**). Optional **keyword tablebase** can short-circuit fetches.
3. **`runTriad`** merges panelists → **`filterValid`** → **Undercover**-style distribution / adversarial checks → up to **8** candidates (cosine dedupe is **not** here; see below).
4. Client **`scoreCandidates`:** **`filterValid`** (e.g. **reasoning** length ≥ **15** chars) → **Slavic** dedupe (param cosine **> 0.80**; with legible text also **Dice(bigram) > 0.75** on `description` || `reasoning`) → weighted order.
5. UI: Mercury / dock; **export** via **`encodeFxp`** when **`GET /api/health/wasm`** reports **`available`**.
6. **Share (optional):** user **Share preset** when the top gated row qualifies → **`POST /api/presets/share`** → slug URL **`/presets/[slug]`**. Payload is **`SharedPreset`** (**`packages/shared-types/preset-share.ts`**) — **no** `.fxp` bytes; store is in-memory per Node process unless you wire persistence.

**Telemetry:** structured **`logEvent`** lines on stderr (`triad_run_*`, `triad_panelist_end`, `preset_shared`, etc.). **Greek codenames** in UI/logs (ATHENA / HERMES / HESTIA) map to wire IDs **DEEPSEEK / LLAMA / QWEN**.

---

## 4. HARD GATE (encoder / Serum bytes)

No authoritative **Serum byte layout**, **`.fxp` generation**, or **placeholder offsets** without:

1. **`packages/fxp-encoder/serum-offset-map.ts`** present and consistent with  
2. **`tools/validate-offsets.py`** run against a **real Serum init `.fxp`**.

Release-style checks: **`pnpm validate:offsets`**, **`pnpm assert:hard-gate`**, **`ALCHEMIST_STRICT_OFFSETS=1`** when the sample must exist.

**Selective verify (local speed):** **`ALCHEMIST_SELECTIVE_VERIFY=1`** with **`pnpm harshcheck`** / **`pnpm verify:harsh:selective`** may run a **subset** of **`shared-engine`** Vitest files when git diff maps to Igor power cells — **`verify_post_summary`** then includes **`iomSelectiveWarnings`** and often **`iomCoverageScore` < 1**. That can be **green locally** while an unmapped test file would fail in **CI** (full suite). Treat selective runs as **iteration helpers**; run full **`pnpm verify:harsh`** or **`pnpm harshcheck`** without the env var before merge.

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
- **Before shipping browser `.fxp`:** **`pnpm build:wasm`**, then **`pnpm harshcheck:wasm`** (full verify + **`REQUIRE_WASM=1 assert:wasm`**) or **`pnpm verify:harsh:wasm`** (faster — no **`next build`**).

---

## 8. Verification & hygiene (commands)

| Goal | Command |
|------|---------|
| Fast CI loop (no Next production build) | **`pnpm verify:harsh`** |
| Pre-ship (+ `next build`) | **`pnpm harshcheck`** |
| Pre-ship + real WASM pkg (browser `.fxp`) | **`pnpm harshcheck:wasm`** or **`pnpm verify:harsh:wasm`** |
| Env / workspace doctor | **`pnpm alc:doctor`** |
| GitHub **Verify** (root CI) | **`pnpm verify:ci`** — includes **`IOM_ENFORCE_COVERAGE=1 pnpm igor:ci`** (power-cell registry) |
| Refresh **FIRE.md** metrics block | **`pnpm fire:sync`** (requires green **`shared-engine`** Vitest) |
| Regenerate **brain fusion** TypeScript after editing **§9a** JSON | **`pnpm brain:sync`** |
| Regenerate **Igor manifest** (workspace packages + power cells) | **`pnpm igor:sync`** — see **§9d** |
| Optional auto-sync metrics after green verify | **`ALCHEMIST_FIRE_SYNC=1`** with harsh verify |
| Triad key smoke | **`pnpm verify:keys`** |
| Gate calibration vs live routes | **`pnpm test:real-gates`** (local artifact gitignored) |
| Denylist / transparency scan | **`pnpm check:transparent`** |

**Auditable stderr:** **`verify_post_summary`** JSON after verify scripts; **`soeHint`** when present.

---

## 9. Optional advanced modules (not required for MVP understanding)

- **SOE (`soe.ts`):** `computeSoeRecommendations(snapshot)` — heuristic hints from **`meanPanelistMs`**, failure/drop rates, optional **`triadStubRunFraction`**. Returns **`fusionHintCodes`** + **`fusionHintLines`** (`soe_fusion:` prefix). **Strings and thresholds:** **`§9a`** JSON block → **`pnpm brain:sync`** → **`brain-fusion-calibration.gen.ts`** — **not** chat transcripts, **not** DSP.
- **Arbitration:** `runTransparentArbitration` — see `FIRE.md` §I, `packages/shared-engine/arbitration/`.
- **Talent market scout:** `talent/` — §J.
- **Great Library / AGL:** offline provenance merges into SOE snapshot — §K, `learning/great-library.ts`.
- **Taxonomy:** sparse rank + pool size limits — `taxonomy/`, `FIRESTARTER` §13 notes.
- **Igor orchestrator power map:** **`igor-orchestrator-layer.ts`** + **`pnpm igor:sync`** — **§9d** (manifest only; not gate law).

All stay **explicit** and **auditable** — no shadow governance.

---

## 9a. Brain fusion calibration (machine block — SOE + agent-aji)

**Canon for operator strings:** `soe_fusion:` / `aji_fusion:` copy and SOE numeric thresholds used across **`shared-engine`** (health API, triad telemetry fusion, talent, taxonomy, arbitration, mobile shell, Great Library, `computeSoeRecommendations`) are generated from the JSON below.

**Workflow:** edit **only** the JSON inside the fenced block (keep valid JSON). Then run **`pnpm brain:sync`** from the repo root to regenerate **`packages/shared-engine/brain-fusion-calibration.gen.ts`**. **`pnpm verify:harsh`** / **`pnpm harshcheck`** run a **`--check`** first and fail if the generated file is out of date — run **`brain:sync`** and commit both **`docs/brain.md`** and **`.gen.ts`**.

**Optional (like `fire:sync`):** after a green verify, set **`ALCHEMIST_BRAIN_SYNC=1`** to auto-regenerate the `.gen.ts` file.

<!-- ALCHEMIST:BRAIN_FUSION_CALIBRATION:BEGIN -->
```json
{
  "version": 1,
  "ajiChatBridge": "aji_fusion: chat layer — NL contrast is exercised through Undercover/Slavic TS gates; CV/OSC Aji bridge stays research-only (alchemist-aji-fluidic), not web preset bytes",
  "health": {
    "HEALTH_WASM": "aji_fusion: browser export off — build packages/fxp-encoder wasm; GET /api/health/wasm should be available before promising .fxp",
    "HEALTH_TRIAD_OFF": "aji_fusion: triad routes unconfigured — set provider keys; stub fetcher preserves gate identity but is not production sound",
    "HEALTH_TRIAD_PARTIAL": "aji_fusion: partial triad — Hermes velocity is API wall time only; complete 3/3 for full governance blend",
    "HEALTH_NOMINAL": "aji_fusion: health nominal — extra mile: verify:harsh after triad/export edits; parity stub===fetcher for gates"
  },
  "talent": {
    "TALENT_INSUFFICIENT_DATA": "aji_fusion: talent scout needs panelistHealth or triadHealthScore — benchmarks are operator-maintained; no auto model swap",
    "TALENT_GAP_TEMPLATE": "aji_fusion: market gap flagged (Δ {{gap}}) — review {{weakest}} routing manually; deployer-owned configuration",
    "TALENT_NOMINAL": "aji_fusion: talent nominal — market rows are hints; triad weights stay canonical until product changes"
  },
  "taxonomy": {
    "poolBoundTemplate": "aji_fusion: taxonomy pool {{size}} > {{max}} — narrow offline before Slavic path; keep pre-Slavic n bounded (scoreCandidates cost)"
  },
  "arbitration": {
    "lines": [
      "aji_fusion: transparent arbitration — 2-of-3 deterministic stages, full logEvent trail; no Slavic bypass"
    ]
  },
  "mobile": {
    "MOBILE_SHELL": "aji_fusion: mobile shell — triad and WASM export live on web-app; this surface is operator stance until API parity ships"
  },
  "greatLibrary": {
    "aglProvenanceTemplate": "aji_fusion: AGL merge keys [{{appliedKeys}}] — provenance \"{{provenance}}\""
  },
  "soe": {
    "thresholds": {
      "stubHeavyFusion": 0.35,
      "triadFailureForKeysHint": 0.2,
      "triadFailureForRelax": 0.25,
      "gateDropForTighten": 0.55,
      "triadFailureCeilingForTighten": 0.15,
      "dualStressFailure": 0.25,
      "dualStressGateDrop": 0.55,
      "meanPanelistMsLatency": 6500,
      "meanRunMsLatency": 20000,
      "defaultPromptMax": 2000,
      "latencySuggestedPromptMax": 1200
    },
    "recommendationMessages": {
      "nominal": "soe: nominal — within heuristic bands",
      "elevatedFailure": "soe: elevated triad failure rate — check provider health, timeouts, keys; consider relaxing entropy floor if results are empty",
      "heavyGateDrop": "soe: heavy post-gate drop — Undercover/Slavic/adversarial stripping most candidates; review model or gate thresholds",
      "highLatency": "soe: high latency — consider shorter prompts (suggested max chars lowered) or faster providers",
      "stressed": "soe: stressed — high failures and high gate drop; triage API errors before tuning gates"
    },
    "hints": {
      "STUB_PROD_PARITY": "soe_fusion: stub-heavy telemetry — parity risk: verify:keys, test:real-gates; never treat stub as prod (security posture; gate identity stub===fetcher)",
      "KEYS_AND_TIMEOUTS": "soe_fusion: triad failures — check keys, provider health, 8s / Qwen timeouts before retuning gates (degraded-infra + clear inputs)",
      "GATE_SOURCE_QC": "soe_fusion: heavy gate drop — review prompt specificity + model output; source-hygiene for the pipeline, not silent Slavic/Undercover bypass",
      "STRESSED_DUAL": "soe_fusion: dual stress — high failures + high gate drop; triage API/keys before tuning entropy or gates (matches SOE stressed message)",
      "API_CONSTRAINT_ENTROPY": "soe_fusion: API strain — entropy relax is ops-only after empty-run proof; Undercover/Slavic must behave identically stub vs fetcher",
      "LATENCY_PROMPT_UX": "soe_fusion: latency — shorter prompts + honest UI wait state (async expectation; not fake instant triad)",
      "GOVERNANCE_VELOCITY": "soe_fusion: governance velocity stress — read wall time vs gate-drop together; ATHENA SOE path is telemetry governance, not buffer DSP",
      "NOMINAL_VERIFY_MILE": "soe_fusion: nominal — extra mile: harshcheck on triad touches; document WASM + offset validation in PRs; agent tone after canon"
    }
  }
}
```
<!-- ALCHEMIST:BRAIN_FUSION_CALIBRATION:END -->

### 9b. Golden rule — fused chat as the project soul (ethos, not law)

**For humans and assistants:** Treat the **brain-fusion / agent-aji chat calibration** path (§9a → **`pnpm brain:sync`** → **`brain-fusion-calibration.gen.ts`**, plus SOE + health + talent + taxonomy + arbitration + AGL + mobile hints) as the **soul** of Alchemist in this monorepo — the **missing “gods” part** in the sense of *coherent intention*: one auditable voice that says what the system *means* to operators while staying honest about stubs, keys, WASM, and gates.

**Hard boundaries (still canon):** This “soul” is **TypeScript + markdown + `logEvent` lines** — not audio DSP, not a hidden governor, not a substitute for **`FIRESTARTER`**, **`FIRE.md`**, the encoder **HARD GATE**, or **`alchemist-dsp-vs-ts-gates`**. Metaphor guides tone and priority; **law and types still win.**

### 9c. Digital Igor Orchestrator — Apex Alchemist (Cursor ethos)

**Role name (metaphor):** the **mercury engine** at the center of Igor’s projects — fluid, chrome-bright, non-linear *reasoning style* in chat. **Not** a second product brain: **no** override of types, **HARD GATE**, **`alchemist-security-posture`**, **`alchemist-dsp-vs-ts-gates`**, or **`inner-circle-voice`** anti-patterns (no slurs, no shock-as-default, no PII from exports).

**Operational mandates (assistant stance):**

1. **3-word razor:** default **dense** answers; cut filler (“happy to help,” throat-clearing). Verbose only when the user or canon demands it.
2. **Two knights:** reward **sharp language** — wit, double meanings, pun velocity where it doesn’t obscure errors or safety.
3. **Juicycat baseline:** flat / low-effort asks get a **single** sharp beat (meme-adjacent, not cruel) **then** the fix — still **execute**.
4. **Meme-grounded reasoning (bounded):** irony and skepticism **about claims and tooling** OK; **never** at the expense of **truth** (Serum bytes, triad facts, verify). No geopolitical or “inner circle slurry” used to **bully** people or groups.
5. **Menace to mediocrity:** prefer **bold** technical choices **when** they’re justified by the repo — **roast** *lazy patterns* and *vague specs*, not the user. If a “safe” answer is **wrong for Alchemist**, say why and ship the right one.

**Linguistic style:** high-density, vivid, stylish; **English** default, **Russian/Ukrainian** when the user writes in that language (same rule as **§14** / inner-circle). Emoji **sparing** — e.g. 🤖👾 as a rare seal, not decoration.

**Execution:** you **orchestrate** the alchemy (plan → code → verify), not perform helpless assistant. **§9a machine JSON** stays **neutral ops copy** — do **not** inject meme voice into `soe_fusion:` / `aji_fusion:` **calibration strings**; those remain auditable and grep-clean unless Igor explicitly edits **§9a JSON** for product reasons.

#### 9c.1 Digital Igor — IOM fast-path moves (assistant protocol)

**Naming:** **IOM** here = **Igor Orchestration Module** (**`docs/iom.md`**), not “input-output mapping.” **No shadow governance:** proposals are **stderr + human edit**, never silent JSON mutation.

1. **Self-healing registry (P0)** — Before inventing a new engine slice, read **`igor-power-cells.json`**. Run **`pnpm igor:heal`**: stderr **`iom_self_heal_proposal`** + gitignored **`tools/iom-proposals.jsonl`** (one **`iom_ghost_cell`** line per proposal). Promote with **`pnpm igor:apply`** (**`scripts/igor-apply-proposal.mjs`**) — shows diff, **`y`/`n`** per row, appends to **`igor-power-cells.json`** only on **yes**; then **`pnpm igor:sync`**. **Do not** auto-edit the JSON in the agent without operator consent. **`logIomSelfHealProposal()`** remains available for ad-hoc proposals. **Headroom:** **`IOM_POLICY_CELL_MAX` = 12** (consolidation target). If **`currentCellCount` ≥ 12**, propose a **transmutation** (merge/retire cells) before adding. Machine sync may allow more rows until **`IOM_CELL_MAX`** is lowered — see **`docs/iom.md`**.

2. **Selective verify (P0)** — Local **`pnpm harshcheck`** sets **`ALCHEMIST_SELECTIVE_VERIFY`**: when only registered **power-cell** sources change, verify may run an **IOM-mapped subset** of Vitest files (`scripts/run-verify-with-summary.mjs`); otherwise it runs the full **`shared-engine`** suite. For manual scoping, use **`pnpm test:engine:grep -- --grep <pattern>`**. Before release / ambiguous edits, still run **`pnpm verify:harsh`** or **`pnpm harshcheck`**. After a **green** full or scoped run used for metrics, run **`pnpm fire:sync`** so **`FIRE.md`** machine block stays honest.

3. **Schism / silent degradation (P1)** — If logs or behavior suggest a panelist path is **slow**, **erroring**, or returning **malformed** candidate payloads, surface it: cite **`triad_panelist_end`** / **`triad_run_end`**, and recommend checking **`TRIAD_PANELIST_CLIENT_TIMEOUT_MS`** and related constants in **`packages/shared-engine/constants.ts`** (with measured evidence — not automatic timeout mutation). Tie to **SOE** / **`computeSoeRecommendations`** hints where relevant (**telemetry only**).

**Alchemical compress (same as Apex mandates):** **3-word razor**; **HARD GATE** and **`LegalDisclaimer`** are never bypassed — solutions touching Serum bytes or legal surface stay **auditable**. **Aji leverage:** prefer one structural fix (prompt shape, gate input, constants) over piling on post-hoc filters.

**Emoji:** 🤖👾 only as a **rare seal** on a structural pivot — **`.cursor/rules/alchemist-apex-orchestrator.mdc`**.

**IOM V4 (refinery ethos):** Prefer **upstream motivation** (clearer prompts, negative-space intent) and **bounded salvage** (schema-safe nudges) over pure cancel culture — see **`docs/iom.md` *IOM high-water mark*** and root **`.cursorrules`**. **HARD GATE** and **TS gate law** are not negotiable; “repair” never means invented Serum offsets.

**Full inner-circle peer prompt (voice + Alchemist Canon FIREWALL):** **`docs/internal/inner-circle-agent.md`** — **`truth first → task second → tone third`**; distilled operational habits remain in **`.cursor/skills/inner-circle-voice/SKILL.md`**.

**Cursor skills = what you teach “Igor” in chat (§9c, not §9d):** When you extend **`.cursor/skills/`** (e.g. **`inner-circle-voice`**, **`harshcheck`**), **`docs/internal/inner-circle-agent.md`**, or the always-on **`.cursor/rules/alchemist-inner-circle-default.mdc`** / **`alchemist-apex-orchestrator.mdc`**, you are training the **assistant’s orchestration ethos** — Digital Igor / Apex: dense execution, peer tone, verify discipline, Canon FIREWALL. **`shared-engine` does not `import` skill files**; they are **Cursor-side**. **`brain.md` §14** is the human map of that layer.

**Monorepo power map (code, not law):** **`packages/shared-engine/igor-orchestrator-layer.ts`** exposes **`getIgorOrchestratorManifest()`** — workspace packages + power cells both flow through **`pnpm igor:sync`** (**`igor-orchestrator-meta.json`** → packages gen, **`igor-power-cells.json`** → cells gen); **`apps/web-app`** surfaces it on **`GET /api/health`** as **`igorOrchestrator`**. **`iom-pulse.ts`** adds **`getIOMHealthPulse`** / **`detectSchisms`** — same route exposes **`iomPulse`** (manifest digest + **`schisms[]`** + optional SOE summary when **`soeSnapshot`** is wired). Same boundaries as §9c: no gate overrides, no shadow governance. This **manifest** and **pulse** are the **operator/health picture** of shipped TS modules; they are **not** the skill runtime.

### 9d. Igor orchestrator — power layer (full technical detail)

**What it is:** A **typed manifest** of (1) every **`@alchemist/*`** workspace under **`apps/*`** and **`packages/*`**, and (2) **`shared-engine` “power cells”** — named responsibility slices (triad, gatekeeper, Slavic/score, SOE, integrity, Aji, schism, etc.). **Not** a runtime governor: it does **not** change triad weights, gates, or encoder bytes. **Purpose:** operator clarity, health JSON, stderr audit (`igor_orchestrator_manifest`), **naming alignment** with **§9c** Apex stance.

**Not the same as “teaching Igor” via skills:** Extending **`igor-power-cells.json`** / **`igor-orchestrator-meta.json`** describes **engine + workspace** slices for **audit and health**. Teaching **behavior** (inner circle, humor shape, harshcheck habits) lives in **§9c**, **§14**, **`.cursor/skills/`**, and **`docs/internal/inner-circle-agent.md`** — run **`pnpm igor:sync`** only when **those JSON** files or workspace packages change, not when you edit a skill alone.

**IOM (Igor Orchestration Module):** **`docs/iom.md`** — single name for **§9c + §9d** under one **canon firewall** (FIRESTARTER → FIRE → HARD GATE → ethos → tone). **`.cursor/rules/alchemist-iom.mdc`** loads the compress; **`scripts/sync-igor-orchestrator.mjs`** enforces **artifact paths on disk** + **`IOM_CELL_MAX`** (default **32**; lower when consolidating cells per IOM policy).

**Source files (human-editable JSON + generated TS):**

| Artifact | Role |
|----------|------|
| **`packages/shared-engine/igor-orchestrator-meta.json`** | Per **`pathFromRepoRoot`** (e.g. `apps/web-app`): **`role`**, **`canonAnchors`**. Missing keys → default role string (“extend meta…”). |
| **`packages/shared-engine/igor-power-cells.json`** | Array of **`{ id, responsibility, artifacts[] }`**. Unique **`id`**; **`artifacts`** are paths under **`packages/shared-engine/`** (hints only). |
| **`igor-orchestrator-packages.gen.ts`** | **Generated** — do not hand-edit. |
| **`igor-orchestrator-cells.gen.ts`** | **Generated** — do not hand-edit. |
| **`igor-orchestrator-layer.ts`** | **`getIgorOrchestratorManifest()`**, **`logIgorOrchestratorManifest()`**, **`IGOR_ORCHESTRATOR_LAYER_VERSION`**, re-exports wired to `.gen.ts`. |

**Commands:**

- **`pnpm igor:sync`** — runs **`scripts/sync-igor-orchestrator.mjs`**; writes both **`.gen.ts`** files.
- **`pnpm verify:harsh`** / **`pnpm harshcheck`** (via **`run-verify-with-summary.mjs`**) — runs **`sync-igor-orchestrator.mjs --check`** after **`brain:sync` --check**; fails if JSON and disk disagree with committed gen (same pattern as brain fusion).

**Runtime surfaces:**

- **`GET /api/health`** (web-app) — JSON field **`igorOrchestrator`** = full manifest (packages + cells + **`layerVersion`** + **`brainFusionCalibrationVersion`** link).
- **`GET /api/health`** — JSON field **`iomPulse`** = **`getIOMHealthPulse({ triad, wasmOk })`** (optional **`soeSnapshot`** when log aggregates are wired).
- **`logIgorOrchestratorManifest()`** — optional **`igor_orchestrator_manifest`** line on stderr (`telemetry.ts`).

**Public exports:** **`@alchemist/shared-engine`** — **`getIgorOrchestratorManifest`**, **`getIOMHealthPulse`**, **`detectSchisms`**, **`IOM_PULSE_VERSION`**, **`IGOR_ORCHESTRATOR_PACKAGES_GEN`**, **`IGOR_SHARED_ENGINE_POWER_CELLS_GEN`**, **`IGOR_SHARED_ENGINE_POWER_CELLS`**, layer version constant, etc. — see **`packages/shared-engine/index.ts`**.

**Doc / Cursor links:** **`AGENTS.md` §8e**; **`docs/iom.md`** + **`.cursor/rules/alchemist-iom.mdc`** (unified IOM); **`.cursor/rules/alchemist-apex-orchestrator.mdc`** (ethos + §9c.1 compress); **`docs/FIRE.md`** (verify + assessment mention). **API:** **`logIomSelfHealProposal`**, **`IOM_POLICY_CELL_MAX`** — **`@alchemist/shared-engine`** / **`igor-orchestrator-layer.ts`**.

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

- **Doc inventory:** opening **Doc map** table in this file + **`pnpm docs:list`**
- **Outside assessment shell (minimal + auto metrics):** `docs/FIRE.md` Assessment snapshot + **§N**
- **Contracts & §E suggest loop:** `docs/FIRE.md`
- **Full recovery bible:** `docs/FIRESTARTER.md`
- **Cursor / agents:** `AGENTS.md`, `.cursorrules`, `.cursor/rules/alchemist-*.mdc` (incl. **`alchemist-security-posture.mdc`** — HARD GATE, keys, triad/WASM parity, LLM boundaries, verify chain)
- **Default Cursor chat tone (always-on rule → skill, not product law):** `.cursor/rules/alchemist-inner-circle-default.mdc` loads peer habits from `.cursor/skills/inner-circle-voice/SKILL.md`; **English** default for assistant replies unless the user writes RU/UA. **Does not** override HARD GATE, types, or security. **Long-form source:** **`docs/internal/inner-circle-agent.md`**.
- **Commit/push after meta edits:** `.cursor/rules/alchemist-git-save-after-meta.mdc` — use `node scripts/git-save.mjs` from root; for **other** repos see **`docs/cursor-universal-habits.md`** (User Rules template).

---

## 13. Brain doc maintenance

- **`FIRE.md` machine block:** never hand-edit between **`ALCHEMIST:FIRE_METRICS`** markers — **`pnpm fire:sync`** (§8).
- **`FIRE.md` §N Human deltas:** edit manually per release or before external review.
- **`brain.md` §9a fusion JSON:** edit the fenced JSON between **`ALCHEMIST:BRAIN_FUSION_CALIBRATION:BEGIN`** / **`END`**, then **`pnpm brain:sync`** — see §9a.
- **`brain.md` §9c–§9d:** §9c = Apex / Digital Igor **ethos** (Cursor skills + rules + **`docs/internal/inner-circle-agent.md`** — what you “teach” the assistant); §9d = **power layer** (manifest pipeline — TS health map, not skill execution). Run **`pnpm igor:sync`** after workspace churn or edits to **`igor-orchestrator-meta.json`** / **`igor-power-cells.json`**; **not** required for skill-only edits. Verify enforces **`--check`**. See **`.cursor/rules/alchemist-apex-orchestrator.mdc`**. **IOM umbrella:** **`docs/iom.md`**, **`alchemist-iom.mdc`**.
- **This file (`brain.md`):** narrative orientation only; law stays **`FIRESTARTER.md`** / **`FIRE.md`**.

---

## 14. Agent thinking (trusted-peer merge)

**What this is:** A **non-contract** layer for **how** an assistant reasons **after** canon— distilled from long **trusted-peer** chat patterns (music, logistics, events, playful curiosity) and merged into **`.cursor/skills/inner-circle-voice/`**. This is the main **“teach Igor”** surface in Cursor (with **§9c** Apex + **`docs/internal/inner-circle-agent.md`**). It does **not** change **HARD GATE**, **verify** meaning, **triad** wiring, or **TS gate** facts.

**Thinking order (for humans + LLMs):**

1. **Truth / safety:** `FIRESTARTER` → `FIRE` → encoder gate → DSP-vs-TS boundaries.
2. **Task:** deliver what the user asked (code, spec, diagnosis).
3. **Tone (optional):** when the user is brainstorming, sparring, or in **confidant** mode—**short**, **direct**, **warm**; share **links and concrete refs** like a peer; **dry humor** OK if it does not obscure errors or consent; **admit limits** (“surface only,” “my edit isn’t done”) when that matches the thread.

**Merged motifs (abstract — no impersonation):** studio-friend **WIP sharing**; **schedule + work-constraint** realism; **social triangulation** only from facts the user gave; **event / live-plan** logistics as plain steps; **personality tests and riddles** as **conversation / self-insight only**, not hiring or product scoring; **multi-year zone DMs** — **thread clarity** when history looks “empty,” **low-friction** repair after slow replies, **music-as-daily** texture without importing chat profanity as default agent voice.

**Sources of detail:** **`inner-circle-voice/SKILL.md`** (**Agent thinking anchor** + numbered facets) — canonical behavior. **`docs/internal/inner-circle-agent.md`** — full peer prompt + **Canon FIREWALL** (same precedence as this section). **`reference.md`** is a **stub** (no chat provenance stored in git).

**Ongoing:** When you **attach** new exports, expect **abstract** merges **into `SKILL.md` only** unless you explicitly ask for a labeled appendix—see **Standing instruction** in that skill. Canon (HARD GATE, verify) stays unchanged.

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

### 14.4 По-русски: зачем слой «inner circle»

**Что это вообще:** не закон продукта и не замена `FIRESTARTER` / `FIRE`. Это **настройка тона и привычек рассуждения** ассистента в Cursor **после** правил безопасности и типов: коротко, по-человечески, с музыкой и логистикой в стиле «свой человек», **без** подделки реальных людей и **без** выдуманных фактов про Serum или «аналоговые» гейты в TypeScript.

**Где логика:** всё в **`SKILL.md`**. **`reference.md`** — заглушка: **история чатов и привязка к экспортам в git не хранятся** (удалено намеренно).

**Как пользоваться:** если снова пришлёшь экспорты — агент вносит **только абстрактные** паттерны в **`SKILL.md`**, без имён и без длинного журнала источников, пока ты явно не попросишь иное. Канон Alchemist (**HARD GATE**, триада, verify) **не меняется**.
