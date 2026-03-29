#!/usr/bin/env node
/**
 * Builds packages/shared-engine/learning/taste/taste-index.json from Exportify CSVs in raw/.
 * Pure Node — no Spotify API. See docs/cursor-taste-rebuild.md.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TASTE_DIR = join(__dirname, "..");
const RAW_DIR = join(TASTE_DIR, "raw");
const OUT_PATH = join(TASTE_DIR, "taste-index.json");
const EXAMPLE_PATH = join(TASTE_DIR, "taste-index.example.json");

const FEATURE_COLS = [
  "Danceability",
  "Energy",
  "Acousticness",
  "Instrumentalness",
  "Valence",
  "Tempo",
  "Loudness",
  "Speechiness",
];

function parseCSVLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tierFromFilename(name) {
  const u = name.toUpperCase();
  if (u.includes("FENOMAN") || u.includes("1F7")) return 1;
  if (u.includes("FAV") || u.includes("ALPAKA")) return 2;
  return 3;
}

function collectCsvRows() {
  if (!existsSync(RAW_DIR)) {
    throw new Error(`missing raw directory: ${RAW_DIR}`);
  }
  const files = readdirSync(RAW_DIR).filter((f) => f.toLowerCase().endsWith(".csv"));
  if (files.length === 0) {
    throw new Error(`no *.csv under ${RAW_DIR} — add Exportify exports first`);
  }
  /** @type {{ features: number[], tier: number, artist: string, source: string, key: string }[]} */
  const rows = [];
  for (const file of files) {
    const tier = tierFromFilename(file);
    const raw = readFileSync(join(RAW_DIR, file), "utf8");
    const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length < 2) continue;
    const header = parseCSVLine(lines[0]).map((h) => h.trim());
    const idx = Object.fromEntries(header.map((h, i) => [h, i]));
    const tn = idx["Track Name"];
    const an = idx["Artist Name(s)"];
    if (tn == null || an == null) {
      throw new Error(`${file}: missing Track Name / Artist Name(s) columns`);
    }
    for (let li = 1; li < lines.length; li++) {
      const cells = parseCSVLine(lines[li]);
      const track = (cells[tn] ?? "").trim();
      const artist = (cells[an] ?? "").trim();
      if (!track || !artist) continue;
      const feats = [];
      let bad = false;
      for (const col of FEATURE_COLS) {
        const j = idx[col];
        if (j == null) {
          bad = true;
          break;
        }
        const v = parseFloat((cells[j] ?? "").replace(",", "."));
        if (!Number.isFinite(v)) {
          bad = true;
          break;
        }
        feats.push(v);
      }
      if (bad) continue;
      rows.push({
        features: feats,
        tier,
        artist,
        source: file,
        key: `${track.toLowerCase()}|${artist.toLowerCase()}`,
      });
    }
  }
  return rows;
}

function dedupeByTier(rows) {
  const map = new Map();
  for (const r of rows) {
    const prev = map.get(r.key);
    if (!prev || r.tier < prev.tier) map.set(r.key, r);
  }
  return Array.from(map.values());
}

function standardScalerFit(rows) {
  const d = FEATURE_COLS.length;
  const mean = new Array(d).fill(0);
  for (const r of rows) {
    for (let j = 0; j < d; j++) mean[j] += r.features[j];
  }
  for (let j = 0; j < d; j++) mean[j] /= rows.length;
  const variance = new Array(d).fill(0);
  for (const r of rows) {
    for (let j = 0; j < d; j++) {
      const x = r.features[j] - mean[j];
      variance[j] += x * x;
    }
  }
  const std = variance.map((v) => Math.sqrt(v / rows.length) || 1e-9);
  return { mean, std };
}

function scaleRow(f, mean, std) {
  return f.map((v, j) => (v - mean[j]) / std[j]);
}

function dist2(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

function kmeans(pointsScaled, k, seed, maxIter = 300) {
  const n = pointsScaled.length;
  const d = pointsScaled[0].length;
  const rand = mulberry32(seed);
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  let centroids = [];
  for (let c = 0; c < k; c++) centroids.push([...pointsScaled[indices[c]]]);
  const assign = new Array(n);
  for (let iter = 0; iter < maxIter; iter++) {
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const dd = dist2(pointsScaled[i], centroids[c]);
        if (dd < bestD) {
          bestD = dd;
          best = c;
        }
      }
      assign[i] = best;
    }
    const newC = Array.from({ length: k }, () => new Array(d).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      const c = assign[i];
      counts[c]++;
      for (let j = 0; j < d; j++) newC[c][j] += pointsScaled[i][j];
    }
    const rand = mulberry32(iter + 901);
    let moved = 0;
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) {
        centroids[c] = [...pointsScaled[Math.floor(rand() * n)]];
        moved += 1;
        continue;
      }
      for (let j = 0; j < d; j++) newC[c][j] /= counts[c];
      moved += dist2(newC[c], centroids[c]);
      centroids[c] = newC[c];
    }
    if (moved < 1e-8) break;
  }
  return assign;
}

function meanFeatures(rows, indices) {
  const d = FEATURE_COLS.length;
  const out = new Array(d).fill(0);
  if (indices.length === 0) return out;
  for (const i of indices) {
    for (let j = 0; j < d; j++) out[j] += rows[i].features[j];
  }
  for (let j = 0; j < d; j++) out[j] /= indices.length;
  return out;
}

function featObj(m) {
  return {
    danceability: m[0],
    energy: m[1],
    acousticness: m[2],
    instrumentalness: m[3],
    valence: m[4],
    tempo: m[5],
    loudness: m[6],
    speechiness: m[7],
  };
}

function clusterCentroidForSchema(m) {
  return {
    energy: m[1],
    valence: m[4],
    tempo: m[5],
    danceability: m[0],
    acousticness: m[2],
    instrumentalness: m[3],
  };
}

function serumBiasFromCentroid(c) {
  const e = c.energy;
  const v = c.valence;
  const t = c.tempo;
  const a = c.acousticness;
  let filterCutoff = "low-warm";
  if (e > 0.75) filterCutoff = "high";
  else if (e > 0.55) filterCutoff = "mid";
  let reverbDepth = "medium";
  if (a > 0.4) reverbDepth = "large";
  else if (e > 0.8) reverbDepth = "short";
  let distortion = "low";
  if (e > 0.8 && v < 0.5) distortion = "high";
  else if (e > 0.6) distortion = "medium";
  let padBrightness = "dark";
  if (v > 0.6) padBrightness = "bright";
  else if (v > 0.4) padBrightness = "mid";
  let arpSpeed = "none";
  if (t > 145) arpSpeed = "fast";
  else if (t > 115) arpSpeed = "mid-fast";
  else if (t > 95) arpSpeed = "slow-mid";
  return { filterCutoff, reverbDepth, distortion, padBrightness, arpSpeed };
}

function refVecFromCluster(c) {
  const x = c.centroid;
  return [x.energy, x.valence, x.tempo / 200, x.danceability, x.acousticness, x.instrumentalness ?? 0.5];
}

/** Same geometry as `refVecFromCluster` for a flat centroid object (unscaled cluster means). */
function flatCentroidToVec(flat) {
  return [
    flat.energy,
    flat.valence,
    flat.tempo / 200,
    flat.danceability,
    flat.acousticness,
    flat.instrumentalness ?? 0.5,
  ];
}

function greedyMatch(computedVec, refs) {
  const k = computedVec.length;
  const pairs = [];
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      pairs.push({ i, j, d: dist2(computedVec[i], refVecFromCluster(refs[j])) });
    }
  }
  pairs.sort((a, b) => a.d - b.d);
  const map = new Array(k).fill(-1);
  const usedI = new Set();
  const usedJ = new Set();
  for (const p of pairs) {
    if (usedI.has(p.i) || usedJ.has(p.j)) continue;
    map[p.i] = p.j;
    usedI.add(p.i);
    usedJ.add(p.j);
    if (usedI.size === k) break;
  }
  return map;
}

function topArtists(rows, indices, limit = 4) {
  const freq = new Map();
  for (const i of indices) {
    const parts = rows[i].artist.split(";").map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      freq.set(p, (freq.get(p) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

function main() {
  try {
    const rawRows = collectCsvRows();
    const rows = dedupeByTier(rawRows);
    if (rows.length < 6) {
      throw new Error(`need at least 6 tracks after dedupe, got ${rows.length}`);
    }
    const { mean, std } = standardScalerFit(rows);
    const scaled = rows.map((r) => scaleRow(r.features, mean, std));
    const assign = kmeans(scaled, 6, 42, 300);
    const byCluster = Array.from({ length: 6 }, () => []);
    for (let i = 0; i < rows.length; i++) byCluster[assign[i]].push(i);

    const example = JSON.parse(readFileSync(EXAMPLE_PATH, "utf8"));
    const refs = example.tasteClusters;
    const computedVec = byCluster.map((idx) => {
      const m = meanFeatures(rows, idx);
      return flatCentroidToVec(clusterCentroidForSchema(m));
    });
    const refMap = greedyMatch(computedVec, refs);

    const totalTracks = rows.length;
    const tier1Idx = rows.map((r, i) => (r.tier === 1 ? i : -1)).filter((i) => i >= 0);
    const tier2Idx = rows.map((r, i) => (r.tier === 2 ? i : -1)).filter((i) => i >= 0);
    const tier1Total = tier1Idx.length || 1;
    const tier2Total = tier2Idx.length || 1;

    const tier1Means = meanFeatures(rows, tier1Idx.length ? tier1Idx : rows.map((_, i) => i));
    const tier2Means = meanFeatures(rows, tier2Idx.length ? tier2Idx : rows.map((_, i) => i));

    const tier1ByK = new Array(6).fill(0);
    const tier2ByK = new Array(6).fill(0);
    for (const i of tier1Idx) tier1ByK[assign[i]]++;
    for (const i of tier2Idx) tier2ByK[assign[i]]++;

    const rawOwn = byCluster.map((_, k) => tier1ByK[k] / tier1Total);
    const maxOwn = Math.max(...rawOwn, 1e-9);
    const rawLh = byCluster.map((_, k) => tier2ByK[k] / tier2Total);
    const maxLh = Math.max(...rawLh, 1e-9);

    const tier1Files = [...new Set(rows.filter((r) => r.tier === 1).map((r) => r.source))];
    const tier1Name = tier1Files[0] ? basename(tier1Files[0], ".csv") : "tier1";

    const tasteClusters = [];
    let dominantK = 0;
    let bestFrac = -1;
    for (let k = 0; k < 6; k++) {
      const refIdx = refMap[k] >= 0 ? refMap[k] : k;
      const ref = refs[refIdx];
      const idx = byCluster[k];
      const m = meanFeatures(rows, idx);
      const c = clusterCentroidForSchema(m);
      const trackCount = idx.length;
      const weight = trackCount / totalTracks;
      const ownMusicAffinity = maxOwn > 0 ? rawOwn[k] / maxOwn : 0;
      const lighthouseAffinity = maxLh > 0 ? rawLh[k] / maxLh : 0;
      if (tier1ByK[k] / tier1Total > bestFrac) {
        bestFrac = tier1ByK[k] / tier1Total;
        dominantK = k;
      }
      tasteClusters.push({
        id: ref.id,
        index: k,
        trackCount,
        weight,
        description: ref.description,
        keyArtists: (() => {
          const a = topArtists(rows, idx, 4);
          return a.length > 0 ? a : ["Unknown"];
        })(),
        centroid: c.instrumentalness != null && c.instrumentalness < 1e-6 ? { ...c, instrumentalness: 0 } : c,
        ownMusicAffinity,
        lighthouseAffinity,
        serum_bias: serumBiasFromCentroid(c),
      });
    }

    const t1 = featObj(tier1Means);
    const e = t1.energy;
    const a = t1.acousticness;
    const v = t1.valence;
    const ins = t1.instrumentalness;
    const tp = t1.tempo;
    const globalBias = {
      preferHighEnergy: e > 0.7,
      avoidHighAcousticness: a < 0.2,
      avoidHighInstrumentalness: ins > 0.5,
      darkValenceBias: v < 0.45,
      tempoRange: [Math.round(tp * 0.85), Math.round(tp * 1.35)],
      governedBy: `${tier1Name} centroid — ${tasteClusters[dominantK].id} dominant`,
    };

    const generatedFrom = [...new Set(rows.map((r) => r.source))].map((s) => {
      const n = rows.filter((x) => x.source === s).length;
      return `${basename(s, ".csv")} (${n} tracks)`;
    });

    const out = {
      schemaVersion: "1.0",
      generatedFrom,
      governanceHierarchy: example.governanceHierarchy,
      ownMusicAnchor: {
        description: example.ownMusicAnchor.description,
        centroid: featObj(tier1Means),
        dominantCluster: dominantK,
      },
      lighthouseAnchor: {
        description: example.lighthouseAnchor.description,
        centroid: featObj(tier2Means),
        dominantCluster: dominantK,
      },
      tasteClusters,
      globalBias,
    };

    writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log(
      JSON.stringify({
        status: "ok",
        clusterCount: 6,
        trackCount: totalTracks,
        outputPath: OUT_PATH,
      }),
    );
    process.exit(0);
  } catch (e) {
    console.log(JSON.stringify({ status: "fail", error: String(e?.message ?? e) }));
    process.exit(1);
  }
}

main();
