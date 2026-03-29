import type { LearningIndex, LearningLesson } from "./lesson-types";

export type SelectedLesson = {
  id: string;
  style: string;
  character: string;
  causalReasoning: string;
  tags: string[];
  /** Optional archetype tag when lesson declares `cluster` (schema ≥1.2). */
  cluster?: string;
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

/** Underscore / slug clusters → token overlap with prompt (deterministic). */
function clusterOverlapScore(cluster: string | undefined, tokens: Set<string>): number {
  if (!cluster?.trim() || tokens.size === 0) return 0;
  const raw = cluster.replace(/_/g, " ");
  for (const seg of tokenizeLower(raw)) {
    if (seg.length < MIN_TOKEN_LEN) continue;
    if (tokens.has(seg)) return 0.35;
  }
  return 0;
}

/** Extra weight when a **priority** mapping key matches a prompt token. */
function priorityMappingOverlapScore(lesson: LearningLesson, tokens: Set<string>): number {
  const pri = lesson.priorityMappingKeys;
  if (!pri?.length || tokens.size === 0) return 0;
  for (const key of pri) {
    for (const seg of tokenizeLower(key)) {
      if (seg.length < MIN_TOKEN_LEN) continue;
      if (tokens.has(seg)) return 0.2;
    }
  }
  return 0;
}

/** Bounded overlap between **coreRules** prose and prompt tokens. */
function coreRulesOverlapScore(lesson: LearningLesson, tokens: Set<string>): number {
  const rules = lesson.coreRules;
  if (!rules?.length || tokens.size === 0) return 0;
  let hits = 0;
  for (const rule of rules) {
    for (const w of tokenizeLower(rule)) {
      if (w.length < MIN_TOKEN_LEN || STOPWORDS.has(w)) continue;
      if (tokens.has(w)) hits += 1;
    }
  }
  return Math.min(0.25, hits * 0.07);
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
  score += clusterOverlapScore(lesson.cluster, tokens);
  score += priorityMappingOverlapScore(lesson, tokens);
  score += coreRulesOverlapScore(lesson, tokens);
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
    const maxLessons = opts?.maxLessons ?? 2;
    const maxCharsPerLesson = opts?.maxCharsPerLesson ?? 120;
    if (!index.lessons.length) return [];

    const tokens = meaningfulPromptTokens(promptText);
    const scored = index.lessons.map((lesson) => ({
      lesson,
      score: scoreLesson(lesson, tokens),
    }));
    const positive = scored.filter((s) => s.score > 0);
    if (!positive.length) return [];

    const clusterHit = (lesson: LearningLesson) =>
      clusterOverlapScore(lesson.cluster, tokens) > 0;
    const priorityHit = (lesson: LearningLesson) =>
      priorityMappingOverlapScore(lesson, tokens) > 0;
    positive.sort((a, b) => {
      const ca = clusterHit(a.lesson) ? 1 : 0;
      const cb = clusterHit(b.lesson) ? 1 : 0;
      if (ca !== cb) return cb - ca;
      const pa = priorityHit(a.lesson) ? 1 : 0;
      const pb = priorityHit(b.lesson) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const cra = coreRulesOverlapScore(a.lesson, tokens);
      const crb = coreRulesOverlapScore(b.lesson, tokens);
      if (cra !== crb) return crb - cra;
      const aa =
        typeof a.lesson.antiPatternCount === "number" ? a.lesson.antiPatternCount : 0;
      const ab =
        typeof b.lesson.antiPatternCount === "number" ? b.lesson.antiPatternCount : 0;
      if (aa !== ab) return ab - aa;
      if (a.score !== b.score) return b.score - a.score;
      return a.lesson.id.localeCompare(b.lesson.id);
    });
    const deduped = dedupeByStyleAndTags(positive);

    return deduped.slice(0, maxLessons).map(({ lesson }) => ({
      id: lesson.id,
      style: lesson.style,
      character: truncateWithEllipsis(lesson.character, maxCharsPerLesson),
      causalReasoning: truncateWithEllipsis(lesson.causalReasoning, maxCharsPerLesson),
      tags: [...lesson.tags],
      ...(typeof lesson.cluster === "string" && lesson.cluster.trim()
        ? { cluster: lesson.cluster.trim() }
        : {}),
    }));
  } catch {
    return [];
  }
}
