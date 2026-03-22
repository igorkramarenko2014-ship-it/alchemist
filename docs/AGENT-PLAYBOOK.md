# Transparent Triad & ops hints — agent playbook

**Path:** `docs/AGENT-PLAYBOOK.md`.  
**Not** canonical law — **`FIRE.md`** (outside assessment / LLM surface) + **`FIRESTARTER.md`** (comprehensive bible + **Doc logic**) are. This file is a **FIRE-aligned** multi-step flow for tools and humans. **Material changes** → update **both** canonical docs per **`FIRESTARTER` Doc logic**.

**Mandate:** Auditable **`logEvent`** telemetry; **no** Slavic bypass; **no** shadow state; **no** unauditable “amnesia” or buffer wipes. See **`FIRE.md` §I–§K** and **`.cursor/skills/harshcheck/SKILL.md`**.

---

## INIT block (paste into a coding agent)

```markdown
# [INIT]: TRANSPARENT TRIAD & OPS HINTS
# [ROLE]: Compliant multi-step execution (TS product layer only)
# [MANDATE]: Auditable telemetry; no Slavic bypass; no shadow state; no gate omnipotence.

- **Truth:** `docs/FIRE.md`, `docs/FIRESTARTER.md`, this playbook.
- **Triad:** LLAMA / DEEPSEEK / QWEN; weights in `constants.ts`; routes under `/api/triad/*`.
- **Forbidden:** Shadow kernel, KGB stacks, `Symbol(VERDICT)` bypasses, amnesia / stderr hiding, auto model-swap without deployer config.
```

---

## 1. Market analysis (optional)

**API:** `analyzeTalentMarket` — `@alchemist/shared-engine` / `talent/market-scout.ts`.

- Pass **`panelistHealth`** and/or **`triadHealthScore`**; optional **`marketGapThreshold`** (default **0.15**).
- If **`operatorReviewSuggested`**, optionally call **`logTalentMarketAnalysis(result, runId)`** → stderr JSON **`talent_market_analysis`**.
- **Does not** change routes, **`PANELIST_WEIGHTS`**, or bypass **`slavicFilterDedupe`**. **§J**.

---

## 2. Great Library → SOE (optional, offline)

**API:** `mergeGreatLibraryIntoSoeSnapshot(base, ctx)` — **`GreatLibraryContext.provenance` required**.

- Then **`computeSoeRecommendations(snapshot)`** for hints.
- Optionally **`logGreatLibraryMerge(result, runId)`** → **`great_library_soe_merge`**. **§K**.

---

## 3. Transparent arbitration (optional)

**API:** `runTransparentArbitration(candidates, { prompt?, runId? })`.

- Runs **`scoreCandidates`** first for both strategies.
- **ALPHA:** descending **`weightedScore`** order.
- **OMEGA:** ascending **`weightedScore`** among survivors (variety — not “chaos” RNG).
- Votes: **deterministic** (**`djb2`**), **2-of-3** majority.
- **Telemetry (all on stderr via `logEvent`):**
  - **`arbitration_start`**
  - **`arbitration_stage_vote`** (per stage)
  - **`arbitration_final`**

**Default:** **not** wired inside **`runTriad`** — integrate only where the product needs it. **§I**.

---

## 4. Verify

```bash
pnpm verify:harsh
```

Before UI-facing changes, prefer green **`verify:harsh`**; before release, **`pnpm harshcheck`**. Capture **`verify_post_summary`** on stderr when useful.

**HARD GATE (encoder bytes):** With a real Serum init preset at **`tools/sample_init.fxp`**, run **`pnpm assert:hard-gate`** or **`pnpm validate:offsets`** so **`tools/validate-offsets.py`** runs with the required **`.fxp`** path. For CI that must fail without the sample: **`ALCHEMIST_STRICT_OFFSETS=1 pnpm assert:hard-gate`**. Canonical: **`FIRE.md` §D**, **`FIRESTARTER` §4 / §9**.

**Web UI:** Candidates remain **`AICandidate`** from **`@alchemist/shared-types`** — **no `any`** on triad output (see harshcheck skill).

---

## 5. Perf audit (optional)

```bash
pnpm perf:boss
```

Stderr **`perf_boss_*`** JSON — hot-path timings including arbitration when the perf suite runs it. **Not** shadow governance — **`packages/shared-engine/perf/README.md`**.

---

## Registry hygiene (no shadow code)

From monorepo root:

```bash
pnpm check:transparent
```

Same as **`node scripts/check-no-shadow-patterns.mjs`**. Fails if forbidden tokens appear in **`packages/shared-engine/**/*.ts`**. Contract: **`FIRE.md` §I** (hygiene row) + **§E1** item 16.

---

## Cross-links

| Topic | Where |
|--------|--------|
| Full contract | **`FIRE.md`** §E–§L |
| HARD GATE / offset validation | **`FIRE.md` §D**, **`FIRESTARTER.md` §4 / §9**; **`pnpm assert:hard-gate`** |
| WASM / Export .fxp (browser) | **`FIRESTARTER.md` §10**, **`FIRE.md` §C / §E1.17** |
| Orientation | **`FIRESTARTER.md`** |
| Harshcheck / UI gate | **`.cursor/skills/harshcheck/SKILL.md`** |
| Arbitration detail | **`packages/shared-engine/arbitration/README.md`** |
| Talent | **`packages/shared-engine/talent/README.md`** |
| AGL | **`packages/shared-engine/learning/README.md`** |
