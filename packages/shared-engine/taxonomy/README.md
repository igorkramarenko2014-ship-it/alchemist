# Taxonomy (offline → triad-sized pool)

**FIRE / FIRESTARTER:** Real-time triad output is **≤ `MAX_CANDIDATES` (8)** with **`AI_TIMEOUT_MS` (8000)** per panelist. A **large taxonomy** (e.g. tens of thousands of rows) is **not** processed inside `runTriad`.

## Modules

| File | Role |
|------|------|
| **`engine.ts`** | **`narrowTaxonomyPoolToTriadCandidates`** — input **≤ `TAXONOMY_PRE_SLAVIC_POOL_MAX` (200)** → **`scoreCandidates`** → **≤ 8**. Throws if over cap. |
| **`sparse-rank.ts`** | **`rankTaxonomy(prompt, fullTaxonomy)`** — **Phase 1:** O(n) keyword match on **`reasoning`** (not `description`), cap **200**; **Phase 2–3:** same as engine ( **`scoreCandidates`**, not raw **`slavicFilterDedupe`** only). **Sync.** Also **`filterTaxonomyByPromptKeywords`**. |

Full matrices (e.g. **45k**) may be passed **only** to **`rankTaxonomy`** / **`filterTaxonomyByPromptKeywords`** — they scan linearly; Slavic **never** runs on the full set.

No authoritative `.fxp` / `SerumState` fills without the **HARD GATE** (`serum-offset-map.ts` + `validate-offsets.py`).

## Anti-patterns (don’t do this)

| Bad pattern | Why |
|-------------|-----|
| Passing **&gt; 200** rows to **`narrowTaxonomyPoolToTriadCandidates`** | **`TaxonomyPoolTooLargeError`** — use **`rankTaxonomy`** or pre-slice / index offline first |
| `item.description` | **`AICandidate`** uses **`reasoning`**, not `description` |
| `import … from '../gates/score'` | Path does not exist — use **`../score`** or **`rankTaxonomy`** / **`narrowTaxonomyPoolToTriadCandidates`** |
| `slavicFilterDedupe(pool, 0.92)` | **One argument only**; threshold is **`SLAVIC_FILTER_COSINE_THRESHOLD`** in `score.ts` |
| `metadata` on `AICandidate` | No `metadata` field — extend **`shared-types`** only with a deliberate schema change |
| `async` with no I/O | Use **sync** APIs; await **real** offline work first |
| Only Slavic, no `scoreCandidates` | Loses **`filterValid`** and **weighted** ordering — use **`scoreCandidates`** (via engine) |
