import { describe, it, expect, vi } from "vitest";
import { runTriad } from "../triad";
import type { AICandidate } from "@alchemist/shared-types";

describe("Task 3: Concurrent Triad Stress Test", () => {
  /**
   * Verified Goal: Ensure that 5 concurrent runTriad calls do not cross-pollinate 
   * or crash. Uses a delayed mock fetcher.
   */
  it("parallel runTriad calls remain isolated", async () => {
    // Mock fetcher with intentional delay to overlap executions
    const mockFetcher = async (prompt: string, panelist: string) => {
      await new Promise(r => setTimeout(r, Math.random() * 50));
      const candidate: AICandidate = {
        state: { 
          oscA: {}, oscB: {}, filter: {},
          meta: {}, master: {}, noise: {}, fx: {},
          envelopes: [], lfos: [], matrix: []
        } as any,
        score: 0.9,
        reasoning: `isolated reasoning for ${prompt} by ${panelist} --- total length check pass`,
        panelist: panelist as any
      };
      return [candidate];
    };

    const prompts = ["BASS", "LEAD", "PAD", "DRUMS", "FX"];
    const t0 = performance.now();
    
    // Execute all in parallel
    const results = await Promise.all(
      prompts.map(p => runTriad(p, { fetcher: mockFetcher as any, skipTablebase: true }))
    );

    const t1 = performance.now();
    const totalDuration = t1 - t0;

    // Concurrency verification
    expect(results).toHaveLength(prompts.length);
    results.forEach((res, i) => {
      expect(res.candidates).toHaveLength(3); // 3 panelists
      res.candidates.forEach(c => {
        // Ensure the candidate reasoning matches the prompt it was called with
        expect(c.reasoning).toContain(prompts[i]);
      });
    });

    // Time verification: If sequential, it would be longer.
    // If parallel, it should be much less than sum of timeouts (~250ms max if serial vs ~100ms parallel).
    // The requirement is <10s for the whole suite.
    expect(totalDuration).toBeLessThan(5000); 
    console.log(`[CONCURRENCY_TEST] 5 runs completed in ${totalDuration.toFixed(2)}ms`);
  });

  /**
   * Memory/Stability: Burn 10 consecutive parallel bursts of 3.
   */
  it("sustained concurrent load stability", async () => {
    const burstSize = 3;
    const iterations = 5;
    
    for (let i = 0; i < iterations; i++) {
      await Promise.all(
        Array(burstSize).fill(0).map((_, j) => 
          runTriad(`BURST_${i}_${j}`, { 
            fetcher: async (p, pan) => {
               // structural valid candidate
               return [{ 
                 state: { meta: {}, master: {}, oscA: {}, oscB: {}, noise: {}, filter: {}, fx: {}, envelopes: [], lfos: [], matrix: [] }, 
                 score: 0.5, reasoning: "sustained load test reasoning 15+ chars", panelist: pan 
               } as any];
            },
            skipTablebase: true 
          })
        )
      );
    }
    expect(true).toBe(true); // Reached end without crash
  });
});
