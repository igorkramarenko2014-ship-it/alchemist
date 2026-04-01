import { describe, expect, it, vi } from "vitest";

describe("health API - influence surface", () => {
  it("returns influence object with priors, learning, aji, and triadMode", async () => {
    // Mock env
    vi.stubEnv("ALCHEMIST_LEARNING_CONTEXT", "1");
    vi.stubEnv("ALCHEMIST_CORPUS_PRIOR", "0");
    vi.stubEnv("ALCHEMIST_TASTE_PRIOR", "1");
    vi.stubEnv("ALCHEMIST_AJI_EXPIRES_AT", "2026-12-31T23:59:59Z");

    const { GET } = await import("@/app/api/health/route");
    const req = new Request("http://localhost/api/health");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.influence).toBeDefined();
    
    const inf = json.influence;
    expect(inf.priorsStatus.active).toBe(true);
    expect(inf.priorsStatus.learningContext).toBe(true);
    expect(inf.priorsStatus.corpusPrior).toBe(false);
    expect(inf.priorsStatus.tastePrior).toBe(true);
    
    expect(inf.learningStatus).toBeDefined();
    expect(["active", "inactive"]).toContain(inf.learningStatus.status);
    
    expect(inf.ajiStatus).toBeDefined();
    expect(inf.ajiStatus.expiresAtUtc).toBe("2026-12-31T23:59:59Z");
    
    expect(inf.triadMode).toBeDefined();
    expect(["fetcher", "partial", "stub", "tablebase"]).toContain(inf.triadMode.mode);
    
    vi.unstubAllEnvs();
  });
});
