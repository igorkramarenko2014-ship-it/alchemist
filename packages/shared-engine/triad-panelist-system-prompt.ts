/**
 * Move 1 — Panelist DNA system prompts.
 *
 * Canon: wire distinct per-panelist prompts for `/api/triad/*` fetcher routes.
 * This file provides an auditor-facing `PANELIST_SYSTEM_PROMPTS` record so
 * Vitest can validate uniqueness and schema constraints.
 */
import type { Panelist } from "@alchemist/shared-types";
import {
  triadPanelistSystemPrompt,
  PANELIST_DNA_SEED,
} from "./triad-panelist-prompt";

export const PANELIST_SYSTEM_PROMPTS: Record<Panelist, string> = {
  DEEPSEEK: triadPanelistSystemPrompt("DEEPSEEK"),
  LLAMA: triadPanelistSystemPrompt("LLAMA"),
  QWEN: triadPanelistSystemPrompt("QWEN"),
};

export { PANELIST_DNA_SEED };

