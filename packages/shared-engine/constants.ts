/**
 * AI Triad and engine constants. Source of truth: shared-types + FIRESTARTER §5.
 */
import type { Panelist } from "@alchemist/shared-types";

/** Max candidates to produce (AI Triad total). */
export const MAX_CANDIDATES = 8;

/** Per-panelist timeout in ms. Fail loudly if exceeded. */
export const AI_TIMEOUT_MS = 8000;

/**
 * Browser → app `/api/triad/*` budget in `runTriad` (must cover server upstream + network slack).
 * Server: DeepSeek/Qwen 12s, Groq/Llama 5s (`triad-panel-route`).
 */
export const TRIAD_PANELIST_CLIENT_TIMEOUT_MS: Record<Panelist, number> = {
  LLAMA: 8_000,
  DEEPSEEK: 14_000,
  QWEN: 14_000,
};

/** Panelist weights for weighted score. Sum = 1. DeepSeek 0.40, Llama 0.35, Qwen 0.25. */
export const PANELIST_WEIGHTS: Record<Panelist, number> = {
  DEEPSEEK: 0.4,
  LLAMA: 0.35,
  QWEN: 0.25,
};
