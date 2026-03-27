import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { RealityTelemetryEventName } from "@alchemist/shared-types";
import { REALITY_TELEMETRY_EVENTS } from "@alchemist/shared-types";
import { logEvent } from "../telemetry";

type OutcomeBucket = "used" | "modified" | "discarded" | "export_success";

type WeeklyOutcomeRollup = {
  schema: "alchemist.rll.outcome_rollup";
  version: 1;
  weekStartUtc: string;
  generatedAt: string;
  counts: Record<OutcomeBucket, number>;
  adoptionRate: number | null;
  adoptionFloor: number;
  belowAdoptionFloor: boolean;
};

const DEFAULT_ADOPTION_FLOOR = 0.2;

function monorepoRootFromCwd(): string {
  const cwd = process.cwd();
  const candidates = [cwd, join(cwd, ".."), join(cwd, "..", ".."), join(cwd, "..", "..", "..")];
  for (const c of candidates) {
    if (existsSync(join(c, "apps")) && existsSync(join(c, "packages"))) return c;
  }
  return cwd;
}

function weekStartUtcIso(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 Sunday ... 6 Saturday
  const shift = day === 0 ? -6 : 1 - day; // Monday start
  d.setUTCDate(d.getUTCDate() + shift);
  return d.toISOString().slice(0, 10);
}

function toBucket(eventName: RealityTelemetryEventName): OutcomeBucket | null {
  switch (eventName) {
    case REALITY_TELEMETRY_EVENTS.OUTPUT_USED:
      return "used";
    case REALITY_TELEMETRY_EVENTS.OUTPUT_MODIFIED:
      return "modified";
    case REALITY_TELEMETRY_EVENTS.OUTPUT_DISCARDED:
      return "discarded";
    case REALITY_TELEMETRY_EVENTS.EXPORT_SUCCEEDED:
      return "export_success";
    default:
      return null;
  }
}

function parseLastRollupForWeek(path: string, weekStartUtc: string): WeeklyOutcomeRollup | null {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8").trim();
  if (!raw) return null;
  const lines = raw.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const row = JSON.parse(lines[i]) as WeeklyOutcomeRollup;
      if (row.weekStartUtc === weekStartUtc && row.schema === "alchemist.rll.outcome_rollup") {
        return row;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Appends weekly RLL adoption rollups to JSONL for audit dashboards.
 * Logging-only: does not mutate gates, weights, or route behavior.
 */
export function recordRllOutcomeEvent(eventName: RealityTelemetryEventName): void {
  const bucket = toBucket(eventName);
  if (!bucket) return;

  const root = monorepoRootFromCwd();
  const outPath =
    process.env.ALCHEMIST_RLL_OUTCOME_PATH ??
    join(root, "artifacts", "rll-outcomes.jsonl");
  mkdirSync(dirname(outPath), { recursive: true });

  const week = weekStartUtcIso();
  const prev = parseLastRollupForWeek(outPath, week);
  const counts: Record<OutcomeBucket, number> = {
    used: prev?.counts.used ?? 0,
    modified: prev?.counts.modified ?? 0,
    discarded: prev?.counts.discarded ?? 0,
    export_success: prev?.counts.export_success ?? 0,
  };
  counts[bucket] += 1;

  const denom = counts.used + counts.modified + counts.discarded;
  const adoptionRate = denom > 0 ? counts.used / denom : null;
  const adoptionFloor = Number.parseFloat(
    process.env.ALCHEMIST_RLL_ADOPTION_FLOOR ?? String(DEFAULT_ADOPTION_FLOOR)
  );
  const saneFloor =
    Number.isFinite(adoptionFloor) && adoptionFloor >= 0 && adoptionFloor <= 1
      ? adoptionFloor
      : DEFAULT_ADOPTION_FLOOR;
  const belowAdoptionFloor = adoptionRate !== null && adoptionRate < saneFloor;

  const row: WeeklyOutcomeRollup = {
    schema: "alchemist.rll.outcome_rollup",
    version: 1,
    weekStartUtc: week,
    generatedAt: new Date().toISOString(),
    counts,
    adoptionRate,
    adoptionFloor: saneFloor,
    belowAdoptionFloor,
  };
  writeFileSync(outPath, `${JSON.stringify(row)}\n`, { encoding: "utf8", flag: "a" });

  if (belowAdoptionFloor) {
    logEvent("soe_rll_adoption_low_hint", {
      weekStartUtc: week,
      adoptionRate,
      adoptionFloor: saneFloor,
      counts,
      note: "RLL adoption below floor — SOE/operator hint only; no gate mutation.",
    });
  }
}
