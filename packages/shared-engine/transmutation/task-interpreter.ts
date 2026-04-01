import type { TaskSchema, TransmutationTaskType, TransmutationMood } from "./transmutation-types";

const TASK_MAP: Record<string, TransmutationTaskType> = {
  pluck: "pluck",
  pad: "pad",
  bass: "bass",
  sub: "bass",
  808: "bass",
  lead: "lead",
  fx: "fx",
  texture: "texture",
  riser: "riser",
  noise: "noise",
};

const MOOD_MAP: Record<string, TransmutationMood> = {
  dark: "dark",
  bright: "bright",
  warm: "warm",
  metallic: "metallic",
  aggressive: "aggressive",
  hard: "aggressive",
  soft: "soft",
  gentle: "soft",
  gritty: "gritty",
  dirty: "gritty",
  clean: "clean",
};

const GENRE_CUES = [
  "alt_rock",
  "synthwave",
  "cinematic",
  "hyperpop",
  "house",
  "techno",
  "electronic",
  "ambient",
];

const NOVELTY_TERMS = ["different", "new", "fresh", "novel", "surprise", "unique"];
const CONSISTENCY_TERMS = ["similar", "consistent", "same vibe", "matching", "related"];

/**
 * Normalizes raw prompt string → TaskSchema (MOVE 3 / Transmutation Phase 1).
 * O(n) complexity. No external deps.
 */
export function interpretTask(prompt: string): TaskSchema {
  const p = prompt.toLowerCase().trim();
  const tokens = p.split(/[^a-z0-9]+/);

  let taskType: TransmutationTaskType = "unknown";
  const moods = new Set<TransmutationMood>();
  const genres = new Set<string>();
  let noveltyMatch = 0;
  let consistencyMatch = 0;

  for (const token of tokens) {
    if (token.length === 0) continue;

    // Check task type (one-pass; last hit wins, though usually specific)
    if (TASK_MAP[token]) {
      taskType = TASK_MAP[token];
    }

    // Check moods
    if (MOOD_MAP[token]) {
      moods.add(MOOD_MAP[token]);
    }

    // Check genres (some might be phrases but prompt is tokenized)
    if (GENRE_CUES.includes(token)) {
      genres.add(token);
    }

    // Novelty signals
    if (NOVELTY_TERMS.includes(token)) {
      noveltyMatch += 1;
    }
    if (CONSISTENCY_TERMS.includes(token)) {
      consistencyMatch += 1;
    }
  }

  // Handle multi-word genre cues if prompt raw contains them
  for (const g of GENRE_CUES) {
    if (p.includes(g.replace("_", " "))) {
      genres.add(g);
    }
  }

  //Novelty preference logic: more novelty terms → high, more consistency terms → low.
  let novelty_preference = 0.5; // Default neutral
  if (noveltyMatch > 0 || consistencyMatch > 0) {
    novelty_preference = noveltyMatch / (noveltyMatch + consistencyMatch);
  }

  const confidence = Math.min(1, (tokens.length > 0 ? (moods.size + genres.size + (taskType !== "unknown" ? 1 : 0)) / 4 : 0));

  return {
    task_type: taskType,
    target_mood: Array.from(moods),
    genre_affinity: Array.from(genres),
    novelty_preference,
    reference_strength: 0.5, // Future: detect specific references
    confidence,
    ambiguity_score: 1 - confidence,
  };
}
