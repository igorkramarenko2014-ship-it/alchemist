import type { LearningIndex, LearningLesson } from "./lesson-types";

export type SelectedLesson = {
  id: string;
  style: string;
  character: string;
  causalReasoning: string;
  tags: string[];
};

/** Minimal English noise tokens — deterministic, no NLP. */
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
]);

const MIN_TOKEN_LEN = 3;

function tokenizeLower(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0);
}

/** Tokens from the user prompt that count for overlap (length + stopword filter). */
function meaningfulPromptTokens(promptText: string): Set<string> {
  const out = new Set<string>();
  for (const w of tokenizeLower(promptText)) {
    if (w.length < MIN_TOKEN_LEN) continue;
    if (STOPWORDS.has(w)) continue;
    out.add(w);
  }
  return out;
}

function truncateWithEllipsis(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  if (maxLen <= 1) return "…";
  return `${s.slice(0, maxLen - 1)}…`;
}

/** +0.5 once per lesson if any mapping key segment matches a meaningful prompt token. */
function mappingKeyOverlapScore(lesson: LearningLesson, tokens: Set<string>): number {
  for (const key of lesson.mappingKeys) {
    for (const seg of tokenizeLower(key)) {
      if (seg.length < MIN_TOKEN_LEN) continue;
      if (tokens.has(seg)) return 0.5;
    }
  }
  return 0;
}

function scoreLesson(lesson: LearningLesson, tokens: Set<string>): number {
  if (tokens.size === 0) return 0;
  let score = 0;
  for (const tag of lesson.tags) {
    let tagHit = false;
    for (const part of tokenizeLower(tag)) {
      if (part.length < MIN_TOKEN_LEN || STOPWORDS.has(part)) continue;
      if (tokens.has(part)) {
        tagHit = true;
        break;
      }
    }
    if (tagHit) score += 2;
  }
  const styleParts = tokenizeLower(lesson.style).filter(
    (w) => w.length >= MIN_TOKEN_LEN && !STOPWORDS.has(w),
  );
  if (styleParts.some((w) => tokens.has(w))) score += 1;
  score += mappingKeyOverlapScore(lesson, tokens);
  return score;
}

function tagsOverlap(a: string[], b: string[]): boolean {
  const setA = new Set(a.map((t) => t.trim().toLowerCase()).filter(Boolean));
  for (const t of b) {
    const k = t.trim().toLowerCase();
    if (k && setA.has(k)) return true;
  }
  return false;
}

function styleKey(style: string): string {
  return style.trim().toLowerCase();
}

/**
 * After sorting by score, keep first occurrence; drop later lessons with same style + overlapping tags.
 */
function dedupeByStyleAndTags(
  ordered: { lesson: LearningLesson; score: number }[],
): { lesson: LearningLesson; score: number }[] {
  const kept: { lesson: LearningLesson; score: number }[] = [];
  for (const row of ordered) {
    const sk = styleKey(row.lesson.style);
    const clash = kept.some(
      (k) =>
        styleKey(k.lesson.style) === sk && tagsOverlap(k.lesson.tags, row.lesson.tags),
    );
    if (!clash) kept.push(row);
  }
  return kept;
}

export type SelectLessonsOptions = {
  maxLessons?: number;
  maxCharsPerLesson?: number;
};

/**
 * Deterministic keyword overlap — no ML. Never throws.
 */
export function selectLessonsForPrompt(
  index: LearningIndex,
  promptText: string,
  opts?: SelectLessonsOptions,
): SelectedLesson[] {
  try {
    const maxLessons = opts?.maxLessons ?? 3;
    const maxCharsPerLesson = opts?.maxCharsPerLesson ?? 120;
    if (!index.lessons.length) return [];

    const tokens = meaningfulPromptTokens(promptText);
    const scored = index.lessons.map((lesson) => ({
      lesson,
      score: scoreLesson(lesson, tokens),
    }));
    const positive = scored.filter((s) => s.score > 0);
    if (!positive.length) return [];

    positive.sort((a, b) => b.score - a.score || a.lesson.id.localeCompare(b.lesson.id));
    const deduped = dedupeByStyleAndTags(positive);

    return deduped.slice(0, maxLessons).map(({ lesson }) => ({
      id: lesson.id,
      style: lesson.style,
      character: truncateWithEllipsis(lesson.character, maxCharsPerLesson),
      causalReasoning: truncateWithEllipsis(lesson.causalReasoning, maxCharsPerLesson),
      tags: [...lesson.tags],
    }));
  } catch {
    return [];
  }
}
