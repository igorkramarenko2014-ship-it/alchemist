import { describe, expect, it } from "vitest";
import { parseLegacySoeHintMessage } from "../soe-hint-structured";

describe("parseLegacySoeHintMessage", () => {
  it("maps velocity hints", () => {
    const h = parseLegacySoeHintMessage("Triad wall time high — check timeouts");
    expect(h.recommendationId).toBe("VELOCITY_LOW");
    expect(h.severity).toBe("warning");
  });

  it("maps wasm hints", () => {
    const h = parseLegacySoeHintMessage("WASM encoder stubbed in pkg/");
    expect(h.recommendationId).toBe("WASM_UNAVAILABLE");
    expect(h.severity).toBe("critical");
  });

  it("returns unknown for unmatched text", () => {
    const h = parseLegacySoeHintMessage("Something opaque happened");
    expect(h.recommendationId).toBe("SOE_HINT_UNKNOWN");
    expect(h.actionable).toBe(false);
  });
});
