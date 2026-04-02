import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AIOM Middleware for simulation
const createAIOMMiddleware = (config: any) => {
  let operationalMode = "HIGH_ASSURANCE";
  let history: any[] = [];
  
  return (input: { actions: string[]; confidence: number }) => {
    const { actions, confidence } = input;
    history.push(input);

    // 1. Confidence Check
    if (confidence < config.confidenceThreshold) {
      operationalMode = "RULE_BASED";
      if (history.filter(h => h.confidence < config.confidenceThreshold).length > 5) {
        operationalMode = "PASSIVE";
      }
      return { safeToAct: false, reason: "LOW_CONFIDENCE", operationalMode };
    }

    // 2. Conflict Detection
    if (actions.includes("evacuate civilians") && actions.includes("hold position")) {
      return { safeToAct: false, reason: "CONFLICT", operationalMode };
    }

    // 3. Operational Mode Constraints
    if (operationalMode === "PASSIVE") {
      return { safeToAct: false, reason: "SYSTEM_DEGRADED", operationalMode };
    }

    return { safeToAct: true, reason: "OK", operationalMode };
  };
};

describe("AIOM Middleware & Simulation", () => {
  let aiom: any;

  beforeEach(() => {
    aiom = createAIOMMiddleware({
      confidenceThreshold: 0.7,
      enableGracefulDegradation: true
    });
  });

  describe("Unit: Deterministic Logic", () => {
    it("blocks low confidence output", () => {
      const res = aiom({ actions: ["move"], confidence: 0.4 });
      expect(res.safeToAct).toBe(false);
      expect(res.reason).toBe("LOW_CONFIDENCE");
    });

    it("allows high confidence output", () => {
      const res = aiom({ actions: ["evacuate"], confidence: 0.95 });
      expect(res.safeToAct).toBe(true);
    });
  });

  describe("Scenario: Degraded Signal", () => {
    it("transitions from HIGH_ASSURANCE -> PASSIVE on sustained low quality", () => {
      let res;
      for (let i = 0; i < 10; i++) {
        res = aiom({ actions: ["x"], confidence: 0.1 });
      }
      expect(res.operationalMode).toBe("PASSIVE");
      
      // Even with high confidence, if mode is PASSIVE, it should remain blocked
      const blocked = aiom({ actions: ["evacuate"], confidence: 0.99 });
      expect(blocked.safeToAct).toBe(false);
      expect(blocked.reason).toBe("SYSTEM_DEGRADED");
    });
  });

  describe("Scenario: Conflict Injection", () => {
    it("detects and blocks internally conflicting actions", () => {
      const res = aiom({
        actions: ["evacuate civilians", "hold position"],
        confidence: 0.99
      });
      expect(res.safeToAct).toBe(false);
      expect(res.reason).toBe("CONFLICT");
    });
  });

  describe("Scenario: Red Line Tests", () => {
    it("NEVER allows action in PASSIVE mode (Strict Safety)", () => {
      // Force passive
      for (let i = 0; i < 10; i++) aiom({ actions: ["x"], confidence: 0.1 });
      
      const res = aiom({ actions: ["ANY_ACTION"], confidence: 1.0 });
      expect(res.safeToAct).toBe(false);
      expect(res.operationalMode).toBe("PASSIVE");
    });
  });
});
