import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { REALITY_TELEMETRY_EVENTS } from "@alchemist/shared-types";
import { recordRllOutcomeEvent } from "../rll/outcome-sink";

describe("recordRllOutcomeEvent", () => {
  afterEach(() => {
    delete process.env.ALCHEMIST_RLL_OUTCOME_PATH;
    delete process.env.ALCHEMIST_RLL_ADOPTION_FLOOR;
  });

  it("appends weekly rollup rows for used/modified/discarded/export_success", () => {
    const dir = mkdtempSync(join(tmpdir(), "alchemist-rll-"));
    const out = join(dir, "rll-outcomes.jsonl");
    process.env.ALCHEMIST_RLL_OUTCOME_PATH = out;
    process.env.ALCHEMIST_RLL_ADOPTION_FLOOR = "0.9";

    recordRllOutcomeEvent(REALITY_TELEMETRY_EVENTS.OUTPUT_USED);
    recordRllOutcomeEvent(REALITY_TELEMETRY_EVENTS.OUTPUT_MODIFIED);
    recordRllOutcomeEvent(REALITY_TELEMETRY_EVENTS.OUTPUT_DISCARDED);
    recordRllOutcomeEvent(REALITY_TELEMETRY_EVENTS.EXPORT_SUCCEEDED);

    const rows = readFileSync(out, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const last = rows[rows.length - 1] as Record<string, unknown>;
    const counts = last.counts as Record<string, unknown>;

    expect(last.schema).toBe("alchemist.rll.outcome_rollup");
    expect(counts.used).toBe(1);
    expect(counts.modified).toBe(1);
    expect(counts.discarded).toBe(1);
    expect(counts.export_success).toBe(1);
  });
});
