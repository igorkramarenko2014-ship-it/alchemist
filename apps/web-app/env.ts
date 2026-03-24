/**
 * Central env access for routes (expand with @t3-oss/env-nextjs + Zod per docs/FIRESTARTER §8).
 * Do not read `process.env` ad hoc in new API routes — add fields here.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  /** Live `/api/triad/deepseek` when non-empty (`DEEPSEEK_API_KEY`). */
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",
  /** Live `/api/triad/qwen` (DashScope OpenAI-compatible) when non-empty (`QWEN_API_KEY`). */
  qwenApiKey: process.env.QWEN_API_KEY ?? "",
  /**
   * OpenAI-compatible API root for Qwen (no trailing slash required).
   * Default Alibaba DashScope compatible v1; use `https://openrouter.ai/api/v1` for OpenRouter (`qwen/qwen-plus` model).
   */
  qwenBaseUrl:
    (process.env.QWEN_BASE_URL ?? "").trim() ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
  /**
   * Live `/api/triad/llama` via Groq OpenAI-compatible API when non-empty.
   * `GROQ_API_KEY` (preferred) or `LLAMA_API_KEY`.
   */
  llamaApiKey: process.env.GROQ_API_KEY ?? process.env.LLAMA_API_KEY ?? "",
  /** Optional Groq model id for Llama panelist (default `llama-3.3-70b-versatile`). */
  llamaGroqModel: process.env.LLAMA_GROQ_MODEL ?? "",
  /**
   * When set, **`GET /api/health/iom`** accepts matching **`X-Ops-Token`** header (operator dashboard).
   * Empty → route returns 503 (disabled).
   */
  alchemistOpsToken: (process.env.ALCHEMIST_OPS_TOKEN ?? "").trim(),
} as const;
