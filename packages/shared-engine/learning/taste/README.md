# Taste Corpus (Phase 4)

Advisory-only operator taste index for `scoreCandidates` — see **`docs/Engine-School-Validation.md`** §9 and **`docs/FIRE.md`** (verify loop).

## Rebuilding the taste index

1. Export updated playlists from [Exportify](https://exportify.net) as CSV.
2. Drop CSV files into `packages/shared-engine/learning/taste/raw/` (gitignored).
   Filename conventions:
   - Own music: include `FENOMAN` or `1F7` in filename → tier 1 (governance anchor)
   - Favourites: include `FAV` or `ALPAKA` in filename → tier 2 (lighthouse)
   - Eclectic corpus: any other name → tier 3 (cluster source)
3. Run: `pnpm taste:rebuild`
4. Verify stdout shows `"status":"ok"` and `"clusterCount":6`.
5. Restart dev server — `taste-index.json` is loaded when the server action runs.

The raw CSVs are gitignored and never committed. `taste-index.json` is gitignored.
Committed artifacts: `taste-schema.json`, `taste-index.example.json`, `compute-taste-affinity.ts`, and scripts under `scripts/`.
