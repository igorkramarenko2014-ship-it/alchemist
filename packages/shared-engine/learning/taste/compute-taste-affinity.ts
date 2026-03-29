import type { AICandidate } from "@alchemist/shared-types";
import type { TasteCluster, TasteIndex } from "./taste-types";

const DEFAULT_NUDGE = 0.06;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function tokenizeLower(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
}

/**
 * Style signals from `reasoning` / `description` — same tokenisation spirit as corpus / learning context.
 */
export function extractTasteSignalVector(text: string): {
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
  acousticness: number;
  instrumentalness: number;
} {
  const raw = text.toLowerCase();
  const toks = new Set(tokenizeLower(raw));

  let energy = 0.5;
  const energyUp =
    /(\b(high energy|aggressive|punch|driving|powerful|intense|hard|distorted|heavy)\b)/.test(raw) ||
    toks.has("driving") ||
    toks.has("aggressive");
  const energyDown =
    /(\b(soft|gentle|mellow|subtle|quiet|ambient|delicate|intimate)\b)/.test(raw) ||
    toks.has("mellow");
  if (energyUp && !energyDown) energy = 0.78;
  else if (energyDown && !energyUp) energy = 0.35;
  else if (energyUp && energyDown) energy = 0.55;

  let valence = 0.5;
  const valUp =
    /(\b(bright|euphoric|happy|uplifting|cheerful|major|airy|sparkle)\b)/.test(raw) ||
    toks.has("euphoric") ||
    toks.has("bright");
  const valDown =
    /(\b(dark|moody|melancholic|brooding|sad|minor|ominous|gloomy)\b)/.test(raw) ||
    toks.has("dark") ||
    toks.has("moody");
  if (valUp && !valDown) valence = 0.72;
  else if (valDown && !valUp) valence = 0.32;
  else if (valUp && valDown) valence = 0.52;

  let tempo = 0.575;
  const bpmMatch = raw.match(/\b(\d{2,3})\s*(?:bpm|beats)\b/i) ?? raw.match(/\b(?:tempo|bpm)\s*[:=]?\s*(\d{2,3})\b/i);
  if (bpmMatch?.[1]) {
    const b = Number(bpmMatch[1]);
    if (Number.isFinite(b)) tempo = clamp01((b - 60) / 140);
  } else if (/\b(fast|driving|uptempo|gallop)\b/.test(raw)) tempo = 0.78;
  else if (/\b(slow|ballad|downtempo|largo)\b/.test(raw)) tempo = 0.38;

  let danceability = 0.5;
  if (/\b(dance|groove|club|four on the floor|bouncy|shuffle)\b/.test(raw)) danceability = 0.72;
  else if (/\b(static|pads only|ambient bed)\b/.test(raw)) danceability = 0.35;

  let acousticness = 0.25;
  if (/\b(acoustic|unplugged|intimate|strings|folk|singer|strummed)\b/.test(raw)) acousticness = 0.72;
  else if (/\b(synthetic|digital|fm|wavetable)\b/.test(raw)) acousticness = 0.12;

  let instrumentalness = 0.2;
  if (/\b(instrumental|no vocals|voiceless|wordless)\b/.test(raw)) instrumentalness = 0.82;
  else if (/\b(vocal|vocoder|vox|lyric)\b/.test(raw)) instrumentalness = 0.08;

  return { energy, valence, tempo, danceability, acousticness, instrumentalness };
}

function clusterToVector(c: TasteCluster): number[] {
  const ins = c.centroid.instrumentalness ?? 0.5;
  return [
    c.centroid.energy,
    c.centroid.valence,
    clamp01(c.centroid.tempo / 200),
    c.centroid.danceability,
    c.centroid.acousticness,
    ins,
  ];
}

function anchorCentroidToVector(centroid: Record<string, number>): number[] {
  const t = centroid.tempo ?? 120;
  return [
    centroid.energy ?? 0.5,
    centroid.valence ?? 0.5,
    clamp01(t / 200),
    centroid.danceability ?? 0.5,
    centroid.acousticness ?? 0.25,
    centroid.instrumentalness ?? 0.2,
  ];
}

/** Cosine similarity on same-length non-negative vectors → [0, 1]. */
export function tasteCosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na * nb);
  return d === 0 ? 0 : clamp01(dot / d);
}

export interface TasteAffinityResult {
  score: number;
  dominantCluster: string;
  ownMusicProximity: number;
  lighthouseProximity: number;
  effectiveWeight: number;
}

export function computeTasteAffinity(
  candidate: AICandidate,
  tasteIndex: TasteIndex,
  options?: { nudgeWeight?: number },
): TasteAffinityResult {
  const effectiveWeight =
    options?.nudgeWeight != null && Number.isFinite(options.nudgeWeight)
      ? clamp01(options.nudgeWeight)
      : DEFAULT_NUDGE;

  const text = `${candidate.description ?? ""} ${candidate.reasoning ?? ""}`.trim();
  const sig = extractTasteSignalVector(text.length > 0 ? text : "neutral preset");
  const candVec = [sig.energy, sig.valence, sig.tempo, sig.danceability, sig.acousticness, sig.instrumentalness];

  let weightedSum = 0;
  let weightNorm = 0;
  let bestId = tasteIndex.tasteClusters[0]?.id ?? "unknown";
  let bestScore = -1;

  for (const cl of tasteIndex.tasteClusters) {
    const cv = clusterToVector(cl);
    const cos = tasteCosineSimilarity(candVec, cv);
    const w = cl.weight * cl.ownMusicAffinity;
    weightedSum += cos * w;
    weightNorm += w;
    const local = cos * w;
    if (local > bestScore) {
      bestScore = local;
      bestId = cl.id;
    }
  }

  let base = weightNorm > 0 ? weightedSum / weightNorm : 0.5;
  const gb = tasteIndex.globalBias;
  if (gb.avoidHighAcousticness && sig.acousticness >= 0.6) base -= 0.15;
  if (gb.darkValenceBias && sig.valence >= 0.62) base -= 0.1;
  if (gb.preferHighEnergy && sig.energy >= 0.65) base += 0.04;
  base = clamp01(base);

  const ownV = anchorCentroidToVector(tasteIndex.ownMusicAnchor.centroid);
  const lightV = anchorCentroidToVector(tasteIndex.lighthouseAnchor.centroid);
  const ownMusicProximity = tasteCosineSimilarity(candVec, ownV);
  const lighthouseProximity = tasteCosineSimilarity(candVec, lightV);

  return {
    score: base,
    dominantCluster: bestId,
    ownMusicProximity,
    lighthouseProximity,
    effectiveWeight,
  };
}
