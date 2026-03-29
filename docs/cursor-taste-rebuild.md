# Cursor Prompt — Taste Corpus Rebuild Script

**Status:** Implemented in-repo — `packages/shared-engine/learning/taste/scripts/build-taste-index.mjs`, `pnpm taste:build-index`, `pnpm taste:rebuild`. Use this file as the **spec / operator checklist** or to re-drive a focused Cursor session.

## Context

The Taste Corpus module (`packages/shared-engine/learning/taste/`) is already built and
integrated. This prompt adds one missing piece: **`pnpm taste:rebuild`** — the operator
workflow for refreshing `taste-index.json` from new Exportify CSV exports without touching
Cursor or Claude.

---

## Hard constraints

- **No gate/weight/threshold changes.** This script is data-pipeline only.
- **No committed sensitive data.** Raw CSVs stay in `learning/taste/raw/` (gitignored).
- **No track titles or full artist lists in committed artifacts** — only `keyArtists[]` arrays
  (max 4 per cluster) in `taste-index.json`.
- `taste-index.json` remains **gitignored**. `taste-schema.json` remains **committed**.
- **`verify:harsh` before and after** — script must not affect existing test suite.
- Script must be runnable without Spotify API keys — operates on local CSV files only.
- **Slavic threshold confirmation required** before touching any file in `score.ts` or
  `validate.ts` — this script does NOT touch those files.

---

## What to build

### Script
**Path:** `packages/shared-engine/learning/taste/scripts/build-taste-index.mjs`

**Input:** All `*.csv` files found under `packages/shared-engine/learning/taste/raw/`
(gitignored directory). CSVs must be Exportify format with columns:
`Track Name, Artist Name(s), Danceability, Energy, Acousticness, Instrumentalness,
Valence, Tempo, Loudness, Speechiness`.

**Algorithm:**
1. Read all CSVs. Tag each row with its source filename.
2. Identify governance tier by filename pattern:
   - Contains `FENOMAN` or `1F7` → tier 1 (`ownMusic`)
   - Contains `FAV` or `ALPAKA` → tier 2 (`lighthouse`)
   - All others → tier 3 (`eclectic`)
3. Combine all rows. Deduplicate by `Track Name + Artist Name(s)` (keep tier-1 copy on collision).
4. Drop rows where any of the 8 feature columns is NaN/empty.
5. Normalise features: StandardScaler on
   `[Danceability, Energy, Acousticness, Instrumentalness, Valence, Tempo, Loudness, Speechiness]`.
6. K-means with **k=6**, `randomSeed=42`, max 300 iterations. Use a pure-JS implementation
   (no Python dependency) — implement simple Lloyd's algorithm inline or use `ml-kmeans` npm
   package if available, otherwise implement from scratch (~60 lines).
7. For each cluster compute:
   - `centroid` (unscaled means of the 8 features)
   - `trackCount`
   - `weight` = trackCount / totalTracks
   - `keyArtists` — top 4 artists by frequency in cluster (split `Artist Name(s)` on `;`, trim)
   - `ownMusicAffinity` = fraction of tier-1 tracks assigned to this cluster / total tier-1 tracks,
     normalised to [0,1] relative to max cluster
   - `lighthouseAffinity` = same logic for tier-2 tracks
   - `serum_bias` — derive heuristically:
     - `filterCutoff`: energy>0.75 → "high", energy>0.55 → "mid", else "low-warm"
     - `reverbDepth`: acousticness>0.4 → "large", energy>0.8 → "short", else "medium"
     - `distortion`: energy>0.8 && valence<0.5 → "high", energy>0.6 → "medium", else "low"
     - `padBrightness`: valence>0.6 → "bright", valence>0.4 → "mid", else "dark"
     - `arpSpeed`: tempo>145 → "fast", tempo>115 → "mid-fast", tempo>95 → "slow-mid", else "none"
8. Compute `globalBias` from tier-1 centroid:
   - `preferHighEnergy`: tier1Energy > 0.7
   - `avoidHighAcousticness`: tier1Acousticness < 0.2
   - `avoidHighInstrumentalness`: tier1Instrumentalness > 0.5
   - `darkValenceBias`: tier1Valence < 0.45
   - `tempoRange`: [Math.round(tier1Tempo * 0.85), Math.round(tier1Tempo * 1.35)]
   - `governedBy`: `"${tier1SourceName} centroid — ${dominantCluster.id} dominant"`
9. Write `taste-index.json` with full structure matching `taste-schema.json`.
10. Stdout: `{"status":"ok","clusterCount":6,"trackCount":N,"outputPath":"..."}` — exit 0.
    On any error: `{"status":"fail","error":"..."}` — exit 1.

**Dependencies allowed:** Node.js built-ins (`fs`, `path`, `crypto`), `papaparse` or manual
CSV parsing (check if already in monorepo deps before adding). No Python. No Spotify API.

### npm script
Root `package.json` includes:

```json
"taste:build-index": "node packages/shared-engine/learning/taste/scripts/build-taste-index.mjs",
"taste:rebuild": "node packages/shared-engine/learning/taste/scripts/build-taste-index.mjs && pnpm taste:validate"
```

### .gitignore entry
Root **`.gitignore`**: `taste-index.json` plus `raw/**` with `!raw/.gitkeep`.

### Raw directory placeholder
`packages/shared-engine/learning/taste/raw/.gitkeep`

### README
`packages/shared-engine/learning/taste/README.md` — operator rebuild steps.

---

## Verify sequence

```bash
pnpm verify:harsh                        # baseline green
# copy your Exportify CSVs into learning/taste/raw/
pnpm taste:rebuild                       # build-index + validate
pnpm test:engine:grep -- --grep taste   # taste-corpus tests still green
pnpm verify:harsh                        # full green after
pnpm igor:heal                           # check for new power cells
pnpm igor:apply                          # confirm before any igor-power-cells.json edit
```

---

## What NOT to do

- Do not read from Spotify API — CSV-only pipeline.
- Do not commit any file from `raw/`.
- Do not commit `taste-index.json`.
- Do not add `taste:rebuild` to `verify:harsh` — index is gitignored, not part of CI gate.
- Do not install heavy ML dependencies (no TensorFlow, no sklearn bindings) —
  K-means must be pure JS or use a lightweight npm package already in the monorepo.
- Do not change `IOM_CELL_MAX`, gate thresholds, or triad weights.
- Do not touch `score.ts` or `validate.ts`.
