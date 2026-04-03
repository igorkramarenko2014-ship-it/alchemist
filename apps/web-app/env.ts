/**
 * Central env access for routes (expand with @t3-oss/env-nextjs + Zod per docs/FIRESTARTER §8).
 * Do not read `process.env` ad hoc in new API routes — add fields here.
 */

function resolveLearningTelemetryEnabled(nodeEnv: string): boolean {
  const v = process.env.ALCHEMIST_LEARNING_TELEMETRY;
  if (v === "0") return false;
  if (v === "1") return true;
  if (nodeEnv === "test") return false;
  if (process.env.VERCEL_ENV === "preview") return true;
  return nodeEnv !== "production";
}

/** JSONL under `artifacts/learning-telemetry/` (or `ALCHEMIST_LEARNING_TELEMETRY_DIR`) for offline aggregation. */
function resolveLearningTelemetryFileEnabled(nodeEnv: string): boolean {
  const v = process.env.ALCHEMIST_LEARNING_TELEMETRY_FILE;
  if (v === "0") return false;
  if (v === "1") return true;
  if (nodeEnv === "test") return false;
  if (nodeEnv === "production") return false;
  if (process.env.VERCEL === "1") return false;
  return nodeEnv === "development";
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  /** Live `/api/triad/deepseek` when non-empty (`DEEPSEEK_API_KEY`). */
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",
  /** Optional DeepSeek model id (default `deepseek-chat`). */
  deepseekModel: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  /** Optional DeepSeek base URL (default `https://api.deepseek.com/v1`). */
  deepseekBaseUrl: (process.env.DEEPSEEK_BASE_URL ?? "").trim() || "https://api.deepseek.com/v1",
  /** Live `/api/triad/qwen` (DashScope OpenAI-compatible) when non-empty (`QWEN_API_KEY`). */
  qwenApiKey: process.env.QWEN_API_KEY ?? "",
  /** Optional Qwen model id (default inferred from baseUrl). */
  qwenModel: process.env.QWEN_MODEL ?? "",
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
  llamaGroqModel: process.env.LLAMA_GROQ_MODEL ?? "llama-3.3-70b-versatile",
  /** Optional Llama (Groq) base URL (default `https://api.groq.com/openai/v1`). */
  llamaGroqBaseUrl: (process.env.LLAMA_GROQ_BASE_URL ?? "").trim() || "https://api.groq.com/openai/v1",
  /**
   * When set, **`GET /api/health/iom`** accepts matching **`X-Ops-Token`** header (operator dashboard).
   * Empty → route returns 503 (disabled).
   */
  alchemistOpsToken: (process.env.ALCHEMIST_OPS_TOKEN ?? "").trim(),
  /**
   * When **`1`**, live `/api/triad/*` fetchers append Engine School context from `learning-index.json`
   * (build with `pnpm learning:build-index`). Default off — avoids extra tokens unless explicitly enabled.
   */
  learningContextEnabled: process.env.ALCHEMIST_LEARNING_CONTEXT === "1",
  /**
   * When **`engine_school_influence`** is emitted (requires **`ALCHEMIST_LEARNING_CONTEXT=1`** too).
   * **`ALCHEMIST_LEARNING_TELEMETRY=1`** — always on. **`=0`** — always off.
   * **Unset:** on in **`NODE_ENV=development`**, on on **Vercel preview** (`VERCEL_ENV=preview`), off in production and in **`NODE_ENV=test`** (avoid test noise unless explicitly **`1`**).
   */
  learningTelemetryEnabled: resolveLearningTelemetryEnabled(process.env.NODE_ENV ?? "development"),
  /**
   * Append structured rows to **`artifacts/learning-telemetry/*.jsonl`** when **`engine_school_influence`** fires.
   * **`ALCHEMIST_LEARNING_TELEMETRY_FILE=1`** — on; **`=0`** — off.
   * **Unset:** on in local **`development`** only; off on **Vercel** (`VERCEL=1`), **production**, **test** (use stderr `logEvent` or set **`ALCHEMIST_LEARNING_TELEMETRY_DIR`** to a writable path).
   */
  learningTelemetryFileEnabled: resolveLearningTelemetryFileEnabled(process.env.NODE_ENV ?? "development"),
  /** Optional absolute directory for JSONL (default `artifacts/learning-telemetry/` under monorepo root). */
  learningTelemetryDir: (process.env.ALCHEMIST_LEARNING_TELEMETRY_DIR ?? "").trim(),
  /**
   * When **`1`**, server action loads **`learning-index.json`** for **`scoreCandidates`** corpus-affinity
   * re-rank (Phase 3). Client still calls **`getCorpusScoringLessons()`** — no secrets in the browser.
   */
  corpusPriorEnabled: process.env.ALCHEMIST_CORPUS_PRIOR === "1",
  /**
   * When **`1`**, triad fetchers append Persona roles as context prefix to triad prompt.
   * Mirror behavior of Engine School (advisory only). Default off.
   */
  personaContextEnabled: process.env.ALCHEMIST_PERSONA_CONTEXT === "1",
  /**
   * When **`1`**, server action loads **`taste-index.json`** (or example) for **`scoreCandidates`**
   * taste-affinity re-rank (Phase 4). Advisory only; default off.
   */
  tastePriorEnabled: process.env.ALCHEMIST_TASTE_PRIOR === "1",
} as const;

/* Optional SOE rollup for GET /api/health → iomPulse: lib/soe-snapshot-from-env.ts
 * ALCHEMIST_SOE_MEAN_PANELIST_MS + ALCHEMIST_SOE_TRIAD_FAILURE_RATE + ALCHEMIST_SOE_GATE_DROP_RATE (0–1);
 * optional ALCHEMIST_SOE_MEAN_RUN_MS, ALCHEMIST_SOE_STUB_RUN_FRACTION (0–1). */
