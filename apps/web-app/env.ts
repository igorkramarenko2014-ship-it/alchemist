/**
 * Central env access for routes (expand with @t3-oss/env-nextjs + Zod per docs/FIRESTARTER §8).
 * Do not read `process.env` ad hoc in new API routes — add fields here.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  /** Live `/api/triad/deepseek` when non-empty; otherwise stub. */
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",
  /** Live `/api/triad/qwen` (DashScope OpenAI-compatible) when non-empty; otherwise stub. */
  qwenApiKey: process.env.QWEN_API_KEY ?? "",
  /**
   * Live `/api/triad/llama` via Groq OpenAI-compatible API when non-empty.
   * Prefer `GROQ_API_KEY` (provider-native); `LLAMA_API_KEY` accepted as alias.
   */
  llamaApiKey: process.env.GROQ_API_KEY ?? process.env.LLAMA_API_KEY ?? "",
  /** Optional Groq model id for Llama panelist (default `llama-3.3-70b-versatile`). */
  llamaGroqModel: process.env.LLAMA_GROQ_MODEL ?? "",
} as const;
