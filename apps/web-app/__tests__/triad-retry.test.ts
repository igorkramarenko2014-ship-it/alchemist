import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { isValidAICandidateArray } from "../lib/triad-candidate-validation";
import { fetchLlamaCandidates } from "../lib/fetch-llama-candidates";

// Mock logEvent
const logEventMock = vi.fn();
vi.mock("@alchemist/shared-engine", async () => {
  const actual = await vi.importActual("@alchemist/shared-engine") as any;
  return {
    ...actual,
    logEvent: (event: string, payload?: any) => logEventMock(event, payload),
  };
});

// Mock fetch
const globalFetch = global.fetch;
describe("Task 1: JSON Validation + Auto-Retry Loop", () => {
  beforeEach(() => {
    logEventMock.mockClear();
    global.fetch = vi.fn();
  });

  afterAll(() => {
    global.fetch = globalFetch;
  });

  it("isValidAICandidateArray identifies correct vs incorrect structures", () => {
    const valid = [
      {
        state: { oscA: {}, oscB: {}, filter: {} },
        score: 0.8,
        reasoning: "good",
        panelist: "LLAMA",
        paramArray: [0, 1]
      }
    ];
    expect(isValidAICandidateArray(valid)).toBe(true);

    const missingState = [{ score: 0.8, reasoning: "bad", panelist: "LLAMA" }];
    expect(isValidAICandidateArray(missingState)).toBe(false);

    const malformedState = [{ state: { filter: {} }, score: 0.8, reasoning: "bad", panelist: "LLAMA" }];
    expect(isValidAICandidateArray(malformedState)).toBe(false);
  });

  it("fetchLlamaCandidates retries on malformed JSON and succeeds on try 2", async () => {
    const mockFetch = vi.mocked(fetch);
    
    // First call returns junk
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("this is not json"),
      status: 200,
    } as Response);

    // Second call returns valid candidates
    const validResponse = {
      choices: [{
        message: {
          content: JSON.stringify([{
            state: { 
              oscA: {}, oscB: {}, filter: {},
              meta: {}, master: {}, noise: {}, fx: {},
              envelopes: [], lfos: [], matrix: []
            },
            score: 0.9,
            reasoning: "this is long enough reasoning to pass the gate",
            panelist: "LLAMA"
          }])
        }
      }]
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(validResponse)),
      status: 200,
    } as Response);

    const result = await fetchLlamaCandidates(
      "test prompt", 
      "fake-key", 
      new AbortController().signal,
      "llama-model",
      "https://api.groq.com/openai/v1"
    );
    
    expect(result.candidates).toHaveLength(1);
    expect(result.retryCount).toBe(1);
    expect(result.retryExhausted).toBe(false);
    expect(logEventMock).toHaveBeenCalledWith("panelist_response_malformed", expect.objectContaining({ attempt: 1 }));
  });

  it("fetchLlamaCandidates exhausting retries on continuous junk", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("still not json"),
      status: 200,
    } as Response);

    const result = await fetchLlamaCandidates(
      "test prompt", 
      "fake-key", 
      new AbortController().signal,
      "llama-model",
      "https://api.groq.com/openai/v1"
    );
    
    expect(result.candidates).toHaveLength(0);
    expect(result.retryCount).toBe(1);
    expect(result.retryExhausted).toBe(true);
    expect(logEventMock).toHaveBeenCalledWith("panelist_response_retry_exhausted", expect.any(Object));
  });
});
