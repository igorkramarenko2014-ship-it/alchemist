/**
 * Append-only JSONL for Engine School telemetry (server routes only).
 * Browser `runTriad` cannot write here — panelist HTTP path emits structured rows for offline aggregation.
 *
 * Vercel serverless: default file sink off (`VERCEL=1`); use stderr `logEvent` or a writable `ALCHEMIST_LEARNING_TELEMETRY_DIR`.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Stable contract for `pnpm learning:aggregate-telemetry` / `learning:assess-fitness`. */
export type EngineSchoolTelemetryRecord = {
  eventType: "engine_school_influence";
  timestampUtc: string;
  source: "triad_panel_route";
  /** Per-panelist HTTP request id (always unique). */
  runId: string;
  /** Client `runTriad` session — same on all three panelist POSTs when provided. */
  triadSessionId: string;
  panelist: string;
  lessonIds: string[];
  appliedRules: string[];
  /** Approximate context size (chars) — not LLM token billing. */
  contextChars: number;
  mode: "unconfigured" | "circuit_open" | "fetcher";
  injected: boolean;
  upstreamError?: boolean;
  /** Raw count from panelist upstream before echo audit. */
  candidatesGenerated: number;
  /** After PNH echo audit (still before `isValidCandidate`). */
  afterEchoAudit: number;
  /** After route `isValidCandidate` — not Slavic/Undercover (those run in client `runTriad`). */
  passedPanelistValidation: number;
  bestScore: number | null;
  meanScore: number | null;
  /** passedPanelistValidation / max(candidatesGenerated, 1) — proxy until triad-level correlation ships. */
  panelistPassRate: number;
  fullGatePipeline: "client_runTriad";
  /** Reserved for A/B baseline runs; null when unavailable. */
  baselineScore: number | null;
  deltaScore: number | null;
  passLift: number | null;
  fitnessContext?: string[];
  cluster?: string;
  gateFailureReasons?: string[];
  soeHintMatched?: string;
};

function findMonorepoRoot(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 28; i += 1) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const pkg = JSON.parse(readFileSync(pj, "utf8")) as { name?: string; workspaces?: unknown };
        if (pkg.name === "alchemist" && Array.isArray(pkg.workspaces)) return dir;
      } catch {
        /* ignore */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Append one JSON line under `artifacts/learning-telemetry/YYYY-MM-DD.jsonl` (or `ALCHEMIST_LEARNING_TELEMETRY_DIR`).
 * No secrets / raw prompts — aggregate stats only.
 */
export function appendEngineSchoolTelemetryJsonl(
  record: EngineSchoolTelemetryRecord,
  opts: { telemetryDirOverride?: string },
): void {
  const root = findMonorepoRoot();
  if (!root) return;
  const day = record.timestampUtc.slice(0, 10);
  const base =
    (opts.telemetryDirOverride ?? "").trim() ||
    join(root, "artifacts", "learning-telemetry");
  const file = join(base, `${day}.jsonl`);
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(record)}\n`, "utf8");
}
