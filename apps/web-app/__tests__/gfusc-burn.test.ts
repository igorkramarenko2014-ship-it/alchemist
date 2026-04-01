import { describe, expect, it, vi, afterEach } from "vitest";
import { getGFUSCBurnState } from "@/lib/gfusc-burn-check";

// We need to mock the burn check BEFORE importing the routes that use it
vi.mock("@/lib/gfusc-burn-check", () => ({
  getGFUSCBurnState: vi.fn(),
}));

describe("GFUSC burn state - lockout behavior", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("api/health returns ok: false and burn details when burned", async () => {
    vi.mocked(getGFUSCBurnState).mockReturnValue({
      state: "burned",
      burnedAtUtc: "2026-03-31T00:00:00Z",
      killswitchGeneration: 1,
      triggerDetails: {
        scenarioId: "test_kill",
        harmIndex: 100,
        triggeredVectors: ["FINANCIAL_HARM"]
      }
    });

    // Fresh import to pick up the mock if needed, though Next.js routes are usually fine
    const { GET } = await import("@/app/api/health/route");
    const req = new Request("http://localhost/api/health");
    const res = await GET(req);
    const json = await res.json();

    expect(json.ok).toBe(false);
    expect(json.live.status).toBe("down");
    expect(json.live.checks.gfusc).toBe("burned");
    expect(json.live.checks.burnedAtUtc).toBe("2026-03-31T00:00:00Z");
    expect(json.live.checks.killswitchGeneration).toBe(1);
    expect(json.triad.panelistRoutes).toBe("down");
  });

  it("api/triad routes return 410 when burned", async () => {
    vi.mocked(getGFUSCBurnState).mockReturnValue({
      state: "burned",
      burnedAtUtc: "2026-03-31T00:00:00Z",
      killswitchGeneration: 1,
      triggerDetails: { scenarioId: "test_kill", harmIndex: 100, triggeredVectors: [] }
    });

    const { POST } = await import("@/app/api/triad/qwen/route");
    const req = new Request("http://localhost/api/triad/qwen", {
      method: "POST",
      body: JSON.stringify({ prompt: "hello" })
    });
    const res = await POST(req);

    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toBe("gfusc_burn_active");
    expect(res.headers.get("x-alchemist-gfusc")).toBe("burned");
  });
});
