/**
 * Aji-style crystallization: noise → admin wipe → one short residue line.
 * Deterministic string geometry only (no LLM / embeddings) — aligns with Slavic/Undercover gates.
 */
import {
  ENTROPY_MESS_MAX_CHARS,
  ENTROPY_MESS_MAX_LINES,
} from "./entropy";

export interface GameChanger {
  idea: string;
  /** Unique-token count per character of `idea` — higher = more concepts per symbol. */
  density: number;
}

const TOKEN_RE = /[a-z0-9]+/gi;

export function tokenizeWords(s: string): string[] {
  const m = s.match(TOKEN_RE);
  if (!m) return [];
  return m.map((w) => w.toLowerCase());
}

/** Conceptual density = |unique tokens| / max(1, length). */
export function conceptualDensity(text: string): number {
  const t = tokenizeWords(text);
  if (t.length === 0) return 0;
  const uniq = new Set(t);
  return uniq.size / Math.max(1, text.length);
}

/** True when the mess exceeds safe distillation bounds (admin trigger). */
export function thresholdLimitExceeded(mess: string[]): boolean {
  const joined = mess.join("\n");
  return mess.length > ENTROPY_MESS_MAX_LINES || joined.length > ENTROPY_MESS_MAX_CHARS;
}

/** Simulated total delete of excess — keep first N lines and trim long rows. */
export function adminWipeMess(mess: string[]): string[] {
  if (!thresholdLimitExceeded(mess)) return mess;
  return mess
    .slice(0, ENTROPY_MESS_MAX_LINES)
    .map((line) => (line.length > 200 ? `${line.slice(0, 197)}…` : line));
}

type LineTok = { lineIndex: number; tokens: string[] };

function bridgeWords(lines: LineTok[]): string[] {
  const wordLines = new Map<string, Set<number>>();
  for (const { lineIndex, tokens } of lines) {
    const seenInLine = new Set<string>();
    for (const w of tokens) {
      if (w.length < 2 || seenInLine.has(w)) continue;
      seenInLine.add(w);
      let set = wordLines.get(w);
      if (!set) {
        set = new Set();
        wordLines.set(w, set);
      }
      set.add(lineIndex);
    }
  }
  const bridges: { w: string; lines: number; freq: number }[] = [];
  wordLines.forEach((lineSet, w) => {
    if (lineSet.size < 2) return;
    let freq = 0;
    for (const { tokens } of lines) {
      for (const t of tokens) {
        if (t === w) freq += 1;
      }
    }
    bridges.push({ w, lines: lineSet.size, freq });
  });
  bridges.sort((a, b) => {
    const sa = a.lines / Math.sqrt(a.freq);
    const sb = b.lines / Math.sqrt(b.freq);
    return sb - sa;
  });
  return bridges.map((b) => b.w);
}

function firstSubstantiveToken(tokens: string[]): string {
  const skip = new Set(["the", "a", "an", "of", "to", "in", "on", "for", "and", "or"]);
  for (const w of tokens) {
    if (w.length >= 3 && !skip.has(w)) return w;
  }
  return tokens[0] ?? "signal";
}

/** Weakest strong links → one capped sentence (the residue). */
export function extractInferredCore(mess: string[], maxChars: number): string {
  const lines: LineTok[] = mess.map((line, lineIndex) => ({
    lineIndex,
    tokens: tokenizeWords(line),
  }));
  const bridges = bridgeWords(lines);
  let idea: string;
  if (bridges.length >= 2) {
    idea = `Bridge ${bridges[0]} and ${bridges[1]} in one preset-scoring slice.`;
  } else if (bridges.length === 1) {
    idea = `Anchor the batch on ${bridges[0]}; fold the rest into the rubric.`;
  } else {
    const a = firstSubstantiveToken(lines[0]?.tokens ?? []);
    const b = firstSubstantiveToken(lines[lines.length - 1]?.tokens ?? []);
    idea = `Fold ${a} and ${b} into a single triad-weighted rubric.`;
  }
  if (idea.length <= maxChars) return idea;
  const cut = idea.slice(0, Math.max(20, maxChars - 1)).trimEnd();
  return `${cut}…`;
}

/**
 * Noise → (optional admin wipe) → one sentence + output density.
 * Requires ≥5 chunks (minimum chaos).
 */
export function runAjiCrystallization(mess: string[]): GameChanger {
  if (mess.length < 5) {
    return { idea: "Insufficient chaos to crystallize.", density: 0 };
  }
  const wiped = adminWipeMess(mess);
  const joined = wiped.join(" ");
  const maxChars = Math.max(24, Math.floor(joined.length * 0.09));
  const core = extractInferredCore(wiped, maxChars);
  return {
    idea: core,
    density: conceptualDensity(core),
  };
}

/** For tests: compare output compression vs raw mess. */
export function ajiCompressionRatio(mess: string[], idea: string): number {
  const rawLen = Math.max(1, mess.join(" ").length);
  return idea.length / rawLen;
}
