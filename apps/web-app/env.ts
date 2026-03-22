/**
 * Central env access for routes (expand with @t3-oss/env-nextjs + Zod per docs/FIRESTARTER §8).
 * Do not read `process.env` ad hoc in new API routes — add fields here.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
