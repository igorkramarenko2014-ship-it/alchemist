import { describe, expect, it, vi } from "vitest";
import { logEvent } from "../telemetry";
import { redactSensitive } from "../telemetry-redact";

describe("telemetry-redact", () => {
  it("redacts OpenAI-style sk- keys in strings", () => {
    const s = redactSensitive("error: sk-abcdefghijklmnopqrstuvwxyz1234567890");
    expect(s).toContain("[REDACTED]");
    expect(s).not.toContain("sk-abcdefghijklmnopqrstuvwxyz1234567890");
  });

  it("redacts Groq-style gsk_ keys", () => {
    const s = redactSensitive({ err: "bad gsk_0123456789012345678901234567890" });
    expect(s).toEqual({
      err: expect.stringContaining("[REDACTED]"),
    });
  });

  it("does not strip normal triad telemetry fields", () => {
    const o = redactSensitive({ panelist: "DEEPSEEK", latencyMs: 1200 });
    expect(o).toEqual({ panelist: "DEEPSEEK", latencyMs: 1200 });
  });

  it("logEvent stderr line redacts nested secret-shaped strings", () => {
    const chunks: string[] = [];
    const w = vi.spyOn(process.stderr, "write").mockImplementation((c: string | Uint8Array) => {
      chunks.push(typeof c === "string" ? c : Buffer.from(c).toString("utf8"));
      return true;
    });
    try {
      logEvent("probe_mirror_image", {
        error: "Invalid key sk-abc123def456ghi789jkl0123456789",
        model: "deepseek-chat",
      });
    } finally {
      w.mockRestore();
    }
    const line = chunks.join("");
    expect(line).toContain("[REDACTED]");
    expect(line).not.toContain("sk-abc123def456ghi789jkl0123456789");
    expect(line).toContain("deepseek-chat");
  });
});
