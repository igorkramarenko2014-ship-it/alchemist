#!/usr/bin/env node
/**
 * **`pnpm vst:observe`** — `vst-bridge` + shared-engine telemetry + optional **surgical repair**.
 *
 * - Positional: **`[provenance]`** (default `cli:<iso>`).
 * - **`--candidate <path>`** or **`ALCHEMIST_VST_CANDIDATE_JSON`**: JSON **`AICandidate`**.
 *   **`performSurgicalRepair`** runs **inside `VstObserver.triggerSync` only after HARD GATE** (see `vst-bridge.ts`).
 * - Env **`ALCHEMIST_TRIAL_PROGRAM_NAME`**: optional FxCk name (max 27 chars).
 */
import { readFileSync } from "node:fs";
import type { AICandidate, Panelist } from "@alchemist/shared-types";
import {
  logEvent,
  performSurgicalRepair,
  recordVstObserverSync,
  setVstObserverStance,
} from "@alchemist/shared-engine";
import {
  type SurgicalRepairFn,
  VstObserver,
  vstObserverConfigFromEnv,
} from "@alchemist/fxp-encoder/vst-bridge";

const PANELISTS: readonly Panelist[] = ["LLAMA", "DEEPSEEK", "QWEN"];

function isPanelist(x: unknown): x is Panelist {
  return typeof x === "string" && (PANELISTS as readonly string[]).includes(x);
}

function parseCandidateJson(raw: unknown): AICandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!isPanelist(o.panelist)) return null;
  if (typeof o.score !== "number" || Number.isNaN(o.score)) return null;
  if (typeof o.reasoning !== "string") return null;
  if (!o.state || typeof o.state !== "object") return null;
  return o as unknown as AICandidate;
}

function parseCli(argv: string[]): { provenance: string; candidatePath?: string } {
  const positionals: string[] = [];
  let candidatePath = process.env.ALCHEMIST_VST_CANDIDATE_JSON?.trim();
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--candidate") {
      candidatePath = args[++i]?.trim();
      continue;
    }
    if (a.startsWith("--candidate=")) {
      candidatePath = a.slice("--candidate=".length).trim();
      continue;
    }
    if (a.startsWith("--")) continue;
    positionals.push(a);
  }
  const provenance = positionals[0]?.trim() || `cli:${new Date().toISOString()}`;
  return { provenance, candidatePath: candidatePath || undefined };
}

const { provenance, candidatePath } = parseCli(process.argv);

const telemetry = {
  logEvent,
  recordVstObserverSync,
  setVstObserverStance,
};

const baseConfig = vstObserverConfigFromEnv(telemetry);

let candidate: AICandidate | undefined;
if (candidatePath) {
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(readFileSync(candidatePath, "utf8")) as unknown;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logEvent("vst_observer_schism", {
      schism: "CANDIDATE_JSON_READ_FAILED",
      provenance,
      path: candidatePath,
      error: message,
    });
    process.stdout.write(
      `${JSON.stringify({ success: false, schism: "CANDIDATE_JSON_READ_FAILED", note: message, provenance }, null, 2)}\n`,
    );
    process.exit(1);
  }

  const parsed = parseCandidateJson(rawJson);
  if (!parsed) {
    logEvent("vst_observer_schism", {
      schism: "CANDIDATE_JSON_INVALID",
      provenance,
      path: candidatePath,
    });
    process.stdout.write(
      `${JSON.stringify({ success: false, schism: "CANDIDATE_JSON_INVALID", provenance }, null, 2)}\n`,
    );
    process.exit(1);
  }
  candidate = parsed;
}

const repairFn = performSurgicalRepair as unknown as SurgicalRepairFn;

const observer = new VstObserver({
  ...baseConfig,
  ...(candidate
    ? {
        surgicalRepair: {
          candidate,
          repair: repairFn,
        },
      }
    : {}),
});

const programName = process.env.ALCHEMIST_TRIAL_PROGRAM_NAME?.trim();
const r = await observer.triggerSync(provenance, programName ? { programName } : undefined);
process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
process.exit(r.success ? 0 : 1);
