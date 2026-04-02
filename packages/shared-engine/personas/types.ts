export interface Violation {
  ruleId: string;
  severity: "hard" | "soft";
  logicRefs: string[];
  matchedEvidence: string;
}

export interface AdherenceReport {
  score: number;
  violations: Violation[];
  status: "stable" | "mild drift" | "degraded" | "failure";
  isSuccess: boolean;
}
