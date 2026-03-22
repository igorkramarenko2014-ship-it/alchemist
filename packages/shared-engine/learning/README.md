# Alchemist Great Library (AGL) — `learning/`

**Scope:** TypeScript **contracts + merge helpers** for feeding **offline** research into **`computeSoeRecommendations`**. This folder is **not** a scraper, **not** a vector database client, and **not** a real-time learner inside the triad request path.

## FIRE alignment

| Requirement | How AGL complies |
|-------------|------------------|
| **≤8s triad** | Learning runs **async** (cron, worker, batch). Never block **`runTriad`**. |
| **HARD GATE** | Any authoritative **Serum byte** / `.fxp` encoding still requires validated **`serum-offset-map.ts`**. AGL may only carry **metadata** or **aggregates** you attest are legal to use. |
| **No shadow / KGB** | **`provenance`** is **mandatory** on **`GreatLibraryContext`**. Optional **`logGreatLibraryMerge`** emits **`great_library_soe_merge`** — auditable. **No** “wipe history” or hidden intuition. |
| **No DSP** | Pure TS; no C++ / VST audio path. |
| **Web bundle** | No Pinecone/Chroma SDK here — keep vector stores in a **separate** package or service so **`web-app`** does not bloat. |

## Files

| File | Role |
|------|------|
| **`great-library.ts`** | **`mergeGreatLibraryIntoSoeSnapshot`**, **`logGreatLibraryMerge`** |
| **`offline-pipeline-types.ts`** | Illustrative types for an **external** indexer (not implemented here) |

## Flow (recommended)

1. **Offline:** Your job collects/embeds **only** data you have rights to use; writes aggregates + **`provenance`**.
2. **Bridge:** Call **`mergeGreatLibraryIntoSoeSnapshot(baseSoeSnapshot, ctx)`** then **`computeSoeRecommendations(snapshot)`**.
3. **Log:** **`logGreatLibraryMerge(result, runId)`** when you want stderr JSON for SOE dashboards.

## Parser / `.fxp`

There is **no** `vst_fxp_extractor.py` in-repo yet. For bytes → parameters, plan on **`tools/validate-offsets.py`** + validated **`serum-offset-map.ts`**. See **`tools/preset-metadata-schema.example.json`** for a **metadata-only** JSON shape offline jobs can emit (no raw preset IP).
