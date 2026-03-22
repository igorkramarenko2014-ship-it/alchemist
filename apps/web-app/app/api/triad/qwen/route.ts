import { env } from "@/env";
import { triadPanelPost } from "@/lib/triad-panel-route";

export const runtime = "nodejs";

/** OpenRouter (and some peers) often need longer than default `AI_TIMEOUT_MS` from shared-engine. */
const QWEN_PANELIST_TIMEOUT_MS = 16_000;

/**
 * `QWEN_BASE_URL` is read in `env.ts` as `env.qwenBaseUrl` (default DashScope; OpenRouter when URL contains `openrouter`).
 * Resolved here so this route module depends on the same env surface as `fetchQwenCandidates`.
 */
function readQwenBaseUrlFromEnv(): string {
  return env.qwenBaseUrl;
}

export async function POST(request: Request) {
  void readQwenBaseUrlFromEnv();
  return triadPanelPost(request, "QWEN", { timeoutMs: QWEN_PANELIST_TIMEOUT_MS });
}
