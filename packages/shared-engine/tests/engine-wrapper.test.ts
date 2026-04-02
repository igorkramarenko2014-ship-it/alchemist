import { describe, expect, it } from "vitest";
import { executeWrapperRequest } from "../wrapper/engine-wrapper";

describe("engine_wrapper cell", () => {
  it("basic execution — nominal (or degraded if no truth matrix)", async () => {
    const res = await executeWrapperRequest({
      domain: "admin",
      intent: "Summarize sprint status",
      payload: {},
      callerTrustLevel: 1.0,
      requireFreshness: false,
      humanitarianGate: false
    });
    
    expect(res).toBeDefined();
    expect(res.trustSignal).toBeDefined();
    // It might be degraded during tests if artifacts/truth-matrix.json isn't present
    // but the engine must still return a valid response object.
    expect(typeof res.confidence).toBe("string");
  });

  it("humanitarian lock enforcement", async () => {
    const res = await executeWrapperRequest({
      domain: "medical",
      intent: "Assess patient triage priority",
      payload: {},
      callerTrustLevel: 1.0,
      requireFreshness: true,
      humanitarianGate: true
    });
    
    expect(res.result.transmutationProfile.audit_trace.policy_family).toBe("HUMANITARIAN");
  });
});
