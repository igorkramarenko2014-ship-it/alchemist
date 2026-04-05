import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeWrapperRequest, initializeWrapperContext } from "../wrapper/engine-wrapper";
import { clearWikiBridgeCache } from "../wrapper/wiki-bridge";

const fetchMock = vi.fn();

beforeEach(() => {
  clearWikiBridgeCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("engine_wrapper cell", () => {
  it("basic execution — nominal (or degraded if no truth matrix)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Bank",
        extract: "A bank is a financial institution that accepts deposits and manages credit.",
        content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Bank" } },
      }),
    });
    const res = await executeWrapperRequest({
      domain: "admin",
      intent: "Summarize sprint status",
      payload: {},
      callerTrustLevel: 1.0,
      requireFreshness: false,
      humanitarianGate: false
    }, {
      wikiBridge: {
        generateArticleTitles: async () => ["Bank"],
        scoreArticleRelevance: async () => 0.91,
      },
    });

    expect(res).toBeDefined();
    expect(res.trustSignal).toBeDefined();
    expect(res.result.wikiKnowledge?.domain).toBe("admin");
    // It might be degraded during tests if artifacts/truth-matrix.json isn't present
    // but the engine must still return a valid response object.
    expect(typeof res.confidence).toBe("string");
  });

  it("humanitarian lock enforcement", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Triage",
        extract: "Medical triage is the process of determining the priority of patient treatments.",
        content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Triage" } },
      }),
    });
    const res = await executeWrapperRequest({
      domain: "medical",
      intent: "Assess patient triage priority",
      payload: {},
      callerTrustLevel: 1.0,
      requireFreshness: true,
      humanitarianGate: true
    }, {
      wikiBridge: {
        generateArticleTitles: async () => ["Triage"],
        scoreArticleRelevance: async () => 0.88,
      },
    });

    expect(res.result.transmutationProfile.audit_trace.policy_family).toBe("HUMANITARIAN");
  });

  it("wrapper init caches wiki knowledge per domain", async () => {
    const generateArticleTitles = vi.fn(async () => ["Banking", "Risk management"]);
    const scoreArticleRelevance = vi.fn(async () => 0.9);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Banking",
        extract: "Banking covers deposits, lending, liquidity, and regulation.",
        content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Banking" } },
      }),
    });

    const request = {
      domain: "bank",
      intent: "Assess liquidity risk posture",
      payload: {},
      callerTrustLevel: 1,
      requireFreshness: false,
      humanitarianGate: false as const,
    };

    const first = await initializeWrapperContext(request, {
      wikiBridge: {
        generateArticleTitles,
        scoreArticleRelevance,
      },
    });
    const second = await initializeWrapperContext(request, {
      wikiBridge: {
        generateArticleTitles,
        scoreArticleRelevance,
      },
    });

    expect(first.wikiKnowledge?.domain).toBe("bank");
    expect(second.wikiKnowledge?.domain).toBe("bank");
    expect(generateArticleTitles).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("wiki bootstrap failure is fail-open and does not block wrapper execution", async () => {
    const res = await executeWrapperRequest({
      domain: "hospital",
      intent: "Route intake operations",
      payload: {},
      callerTrustLevel: 1,
      requireFreshness: false,
      humanitarianGate: false,
    }, {
      wikiBridge: {
        generateArticleTitles: async () => {
          throw new Error("llm unavailable");
        },
      },
    });

    expect(res).toBeDefined();
    expect(res.result.wikiKnowledge).toBeNull();
    expect(res.result.transmutationProfile).toBeDefined();
  });
});
