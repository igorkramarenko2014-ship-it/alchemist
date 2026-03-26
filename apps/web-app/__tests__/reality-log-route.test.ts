import { describe, expect, it, vi } from "vitest";
import { REALITY_TELEMETRY_EVENTS } from "@alchemist/shared-engine";

describe("reality log route", () => {
  it("logs OUTPUT_VIEWED and EXPORT_ATTEMPTED to stderr JSON", async () => {
    const { POST } = await import("@/app/api/reality/log/route");

    const stderrLines: string[] = [];
    const spy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk: unknown) => {
        const s = typeof chunk === "string" ? chunk : String(chunk);
        stderrLines.push(s);
        return true;
      });

    const reqViewed = new Request("http://localhost/api/reality/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "OUTPUT_VIEWED",
        payload: { surface: "dock", panelist: "LLAMA" },
      }),
    });

    const res1 = await POST(reqViewed);
    expect(res1.status).toBe(200);

    const reqExportAttempted = new Request("http://localhost/api/reality/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "EXPORT_ATTEMPTED",
        payload: { wasmAvailable: false, panelist: "LLAMA" },
      }),
    });

    const res2 = await POST(reqExportAttempted);
    expect(res2.status).toBe(200);

    spy.mockRestore();

    const joined = stderrLines.join("");
    expect(joined).toContain(`"event":"${REALITY_TELEMETRY_EVENTS.OUTPUT_VIEWED}"`);
    expect(joined).toContain(`"event":"${REALITY_TELEMETRY_EVENTS.EXPORT_ATTEMPTED}"`);
  });

  it("rejects invalid kind", async () => {
    const { POST } = await import("@/app/api/reality/log/route");

    const req = new Request("http://localhost/api/reality/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "NOT_A_KIND",
        payload: { surface: "dock" },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("invalid_kind");
  });

  it("rejects invalid payload shape", async () => {
    const { POST } = await import("@/app/api/reality/log/route");

    const req = new Request("http://localhost/api/reality/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "OUTPUT_VIEWED",
        payload: "not-an-object",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("invalid_payload");
  });

  it("rejects invalid json", async () => {
    const { POST } = await import("@/app/api/reality/log/route");

    const req = new Request("http://localhost/api/reality/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("invalid_json");
  });
});

