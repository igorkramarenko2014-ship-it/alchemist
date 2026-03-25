# Taxonomy (offline → triad-sized pool)

**FIRE / FIRESTARTER:** Real-time triad output is **≤ `MAX_CANDIDATES` (8)** with **`AI_TIMEOUT_MS` (8000)** per panelist. A **large taxonomy** (e.g. tens of thousands of rows) is **not** processed inside `runTriad`.

## Modules

| File | Role |
|------|------|
| **`prompt-keyword-sparse.ts`** | Phase-1 keyword filter (**`filterTaxonomyByPromptKeywordsWithCap`**) — multi-hit **reasoning** scoring, deterministic tie-break by row index; cap **200**. |
| **`engine.ts`** | **`narrowTaxonomyPoolToTriadCandidates`** — input **≤ 200 only** → **`scoreCandidates`** → **≤ 8**. **`> 200` always throws** (**`TaxonomyPoolTooLargeError`**). |
| **`sparse-rank.ts`** | **`rankTaxonomy(prompt, fullTaxonomy)`** — Phase 1 sparse (≤200) → engine. **Sync.** |
| **`safe-process.ts`** | **`safeProcessTaxonomy(prompt, taxonomy)`** — **preferred entry:** **`≤ 200` → direct engine; `> 200` → `rankTaxonomy`**. Emits **`taxonomy_safe_process`** + **`taxonomyMode` / `taxonomySize` / `fallbackUsed`**. |

Full matrices (e.g. **45k**) → **`safeProcessTaxonomy`** or **`rankTaxonomy`** / **`filterTaxonomyByPromptKeywords`** — Slavic **never** runs on the full set.

**Semantic embeddings** (e.g. transformer similarity for Slavic-adjacent NL dedup) are **not** in **`shared-engine`** — they would add a large runtime dependency and blur the TS statistical gate contract; revisit only as an **optional** sidecar package with explicit opt-in.

No authoritative `.fxp` / `SerumState` fills without the **HARD GATE** (`serum-offset-map.ts` + `validate-offsets.py`).

## Anti-patterns (don’t do this)

| Bad pattern | Why |
|-------------|-----|
| Passing **&gt; 200** rows to **`narrowTaxonomyPoolToTriadCandidates`** | **`TaxonomyPoolTooLargeError`** — use **`safeProcessTaxonomy`** or **`rankTaxonomy`** |
| `item.description` | **`AICandidate`** uses **`reasoning`**, not `description` |
| `import … from '../gates/score'` | Path does not exist — use **`../score`** or **`rankTaxonomy`** / **`narrowTaxonomyPoolToTriadCandidates`** |
| `slavicFilterDedupe(pool)` | **One argument only**; cosine threshold is **`SLAVIC_FILTER_COSINE_THRESHOLD`** in `score.ts` (**0.80**) |
| `metadata` on `AICandidate` | No `metadata` field — extend **`shared-types`** only with a deliberate schema change |
| `async` with no I/O | Use **sync** APIs; await **real** offline work first |
| Only Slavic, no `scoreCandidates` | Loses **`filterValid`** and **weighted** ordering — use **`scoreCandidates`** (via engine) |
