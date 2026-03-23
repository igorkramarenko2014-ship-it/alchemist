import { triadPanelPost } from "@/lib/triad-panel-route";

export const runtime = "nodejs";

/**
 * Qwen via OpenAI-compatible API (`QWEN_BASE_URL`: DashScope default, OpenRouter when URL matches).
 * Upstream timeout: `triad-panel-route` (12s for Qwen unless overridden).
 */
export async function POST(request: Request) {
  return triadPanelPost(request, "QWEN");
}
