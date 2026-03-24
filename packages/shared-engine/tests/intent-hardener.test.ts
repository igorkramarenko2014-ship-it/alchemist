import { describe, expect, it } from "vitest";
import { validateTriadIntent } from "../intent-hardener";

describe("validateTriadIntent", () => {
  it("accepts a normal music-style prompt", () => {
    const r = validateTriadIntent({
      prompt: "Bright pluck lead with short decay and subtle chorus for serum preset",
    });
    expect(r).toEqual({ ok: true });
  });

  it("delegates empty to prompt guard", () => {
    const r = validateTriadIntent({ prompt: "   " });
    expect(r).toEqual({ ok: false, reason: "empty" });
  });

  it("delegates code fence to prompt guard", () => {
    const r = validateTriadIntent({ prompt: "use ```js code``` please" });
    expect(r).toEqual({ ok: false, reason: "code_fence" });
  });

  it("rejects invalid userMode when provided", () => {
    const r = validateTriadIntent({ prompt: "warm bass", userMode: "GOD" });
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.reason).toBe("invalid_user_mode");
    }
  });

  it("accepts PRO and NEWBIE", () => {
    expect(validateTriadIntent({ prompt: "x", userMode: "PRO" }).ok).toBe(true);
    expect(validateTriadIntent({ prompt: "x", userMode: "NEWBIE" }).ok).toBe(true);
  });

  it("rejects low-signal mostly-symbol prompts", () => {
    const junk =
      "@@@@####$$$$%%%%^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^";
    const r = validateTriadIntent({ prompt: junk });
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.reason).toBe("low_signal_prompt");
    }
  });

  it("rejects pathological repetition", () => {
    const r = validateTriadIntent({ prompt: "a".repeat(40) });
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.reason).toBe("pathological_repetition");
    }
  });
});
