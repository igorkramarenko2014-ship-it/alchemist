import { describe, expect, it, vi } from "vitest";
import { REALITY_TELEMETRY_EVENTS } from "@alchemist/shared-types";
import { logRealitySignal, sanitizeRealitySignalPayload } from "../reality-signals-log";

describe("reality-signals-log", () => {
  it("sanitizeRealitySignalPayload strips prompt-like keys and nested objects", () => {
    expect(
      sanitizeRealitySignalPayload({
        prompt: "secret",
        promptHash: "abc",
        surface: "dock",
        nested: { x: 1 },
      })
    ).toEqual({ promptHash: "abc", surface: "dock" });
  });

  it("sanitizeRealitySignalPayload truncates long strings", () => {
    const long = "x".repeat(600);
    const o = sanitizeRealitySignalPayload({ note: long });
    expect((o.note as string).length).toBeLessThanOrEqual(512);
    expect((o.note as string).endsWith("…")).toBe(true);
  });

  it("logRealitySignal emits redacted stderr JSON with layer and event name", () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    logRealitySignal("OUTPUT_USED", {
      surface: "dock",
      promptHash: "90fe0536",
      runId: "run-1",
    });
    const line = spy.mock.calls[0]?.[0];
    spy.mockRestore();
    expect(typeof line).toBe("string");
    const j = JSON.parse(String(line).trim()) as Record<string, unknown>;
    expect(j.event).toBe(REALITY_TELEMETRY_EVENTS.OUTPUT_USED);
    expect(j.layer).toBe("reality_loop");
    expect(j.surface).toBe("dock");
    expect(j.promptHash).toBe("90fe0536");
  });
});
