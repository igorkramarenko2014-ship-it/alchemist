/**
 * **Intent alignment** (MOVE 3, IOM V5) — lightweight **[0,1]** heuristic: token overlap, preset-category
 * lexicon match, optional param spread. **Not** embeddings; **not** gate law — ranking hint only.
 */
import type { AICandidate, UserMode } from "@alchemist/shared-types";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "create",
  "for",
  "from",
  "into",
  "like",
  "make",
  "or",
  "preset",
  "serum",
  "some",
  "sound",
  "that",
  "the",
  "this",
  "want",
  "with",
  "you",
  "token",
]);

/** Same legibility slice as Slavic text path — duplicated here to avoid **`score.ts`** import cycles. */
function candidateLegibilityLower(c: AICandidate): string {
  const d = c.description?.trim();
  const r = c.reasoning?.trim() ?? "";
  const raw = d && d.length > 0 ? d : r;
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

export function tokenizeForIntent(s: string): string[] {
  const t = s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return t.split(/\s+/).filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

/** Jaccard on token sets, **[0,1]** — empty/empty → neutral **0.55**. */
export function tokenSetJaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 0.55;
  if (A.size === 0 || B.size === 0) return 0.25;
  let inter = 0;
  A.forEach((x) => {
    if (B.has(x)) inter += 1;
  });
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

const CATEGORY_LEXICON: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["bass", ["bass", "sub", "808", "growl", "low end"]],
  ["pad", ["pad", "atmos", "ambient", "wash", "lush"]],
  ["lead", ["lead", "solo", "melody", "hook"]],
  ["pluck", ["pluck", "plucky", "short"]],
  ["keys", ["keys", "piano", "epiano", "rhodes"]],
  ["arp", ["arp", "arpeggio", "seq", "sequence"]],
  ["bright", ["bright", "airy", "shimmer", "glass"]],
  ["dark", ["dark", "moody", "ominous", "cinematic"]],
];

function categoriesFromText(tokens: string[], rawLower: string): Set<string> {
  const out = new Set<string>();
  for (const [id, kws] of CATEGORY_LEXICON) {
    for (const kw of kws) {
      if (rawLower.includes(kw) || tokens.some((t) => t === kw || t.includes(kw))) {
        out.add(id);
        break;
      }
    }
  }
  return out;
}

function categoryAlignmentScore(promptLower: string, promptTok: string[], candText: string): number {
  const ct = candText.toLowerCase();
  const candTok = tokenizeForIntent(candText);
  const pCats = categoriesFromText(promptTok, promptLower);
  const cCats = categoriesFromText(candTok, ct);
  if (pCats.size === 0) return 0.5;
  let inter = 0;
  pCats.forEach((x) => {
    if (cCats.has(x)) inter += 1;
  });
  return inter / pCats.size;
}

/** Normalized spread of **`paramArray`** — flat presets score lower. */
export function paramTextureScore01(pa: number[] | undefined): number {
  if (pa == null || pa.length < 4) return 0.5;
  const n = pa.length;
  let sum = 0;
  for (const x of pa) sum += x;
  const mean = sum / n;
  let v = 0;
  for (const x of pa) {
    const d = x - mean;
    v += d * d;
  }
  const std = Math.sqrt(v / n);
  const cv = mean > 0.08 ? std / mean : std * 2.5;
  return Math.min(1, Math.max(0, cv / 1.2));
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function userModeNudge(
  userMode: UserMode | undefined,
  promptLower: string,
  base: number,
): number {
  if (userMode !== "PRO" && userMode !== "NEWBIE") return base;
  const complexHints = ["complex", "evolving", "layered", "rich", "wide"];
  const simpleHints = ["simple", "minimal", "basic", "clean"];
  const complexHit = complexHints.some((h) => promptLower.includes(h));
  const simpleHit = simpleHints.some((h) => promptLower.includes(h));
  if (userMode === "PRO" && complexHit) return clamp01(base + 0.06);
  if (userMode === "NEWBIE" && simpleHit) return clamp01(base + 0.05);
  return base;
}

export interface IntentAlignmentContext {
  userMode?: UserMode;
}

/**
 * **Heuristic** alignment of **`candidate`** legibility text (+ optional params) with **`prompt`**.
 */
export function computeIntentAlignmentScore(
  prompt: string,
  candidate: AICandidate,
  ctx?: IntentAlignmentContext,
): number {
  const p = prompt.trim();
  if (p.length === 0) return 0.5;
  const promptLower = p.toLowerCase();
  const promptTok = tokenizeForIntent(p);
  const candSlice = candidateLegibilityLower(candidate);
  const keyword = tokenSetJaccard(promptTok, tokenizeForIntent(candSlice));
  const cat = categoryAlignmentScore(promptLower, promptTok, candSlice);
  const pa = candidate.paramArray;
  if (pa == null || pa.length < 4) {
    const combined = 0.62 * keyword + 0.38 * cat;
    return userModeNudge(ctx?.userMode, promptLower, clamp01(combined));
  }
  const tex = paramTextureScore01(pa);
  const combined = 0.45 * keyword + 0.35 * cat + 0.2 * tex;
  return userModeNudge(ctx?.userMode, promptLower, clamp01(combined));
}
