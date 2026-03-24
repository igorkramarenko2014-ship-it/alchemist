import { describe, expect, it } from "vitest";
import { IGOR_SHARED_ENGINE_POWER_CELLS_GEN } from "../igor-orchestrator-cells.gen";
import { IGOR_ORCHESTRATOR_PACKAGES_GEN } from "../igor-orchestrator-packages.gen";
import {
  getIgorOrchestratorManifest,
  IGOR_SHARED_ENGINE_POWER_CELLS,
  IOM_POLICY_CELL_MAX,
  logIgorOrchestratorManifest,
  logIomSelfHealProposal,
} from "../igor-orchestrator-layer";

describe("igor orchestrator power layer", () => {
  it("manifest lists all workspace packages and power cells", () => {
    const m = getIgorOrchestratorManifest();
    expect(m.layerVersion).toBe(4);
    expect(m.packages.length).toBe(IGOR_ORCHESTRATOR_PACKAGES_GEN.length);
    expect(m.packages.map((p) => p.packageName)).toContain("@alchemist/shared-engine");
    expect(m.sharedEnginePowerCells.length).toBe(IGOR_SHARED_ENGINE_POWER_CELLS_GEN.length);
    expect(IGOR_SHARED_ENGINE_POWER_CELLS.map((c) => c.id)).toContain("gatekeeper");
    expect(IGOR_SHARED_ENGINE_POWER_CELLS.map((c) => c.id)).toContain("schism");
  });

  it("logIgorOrchestratorManifest does not throw", () => {
    expect(() => logIgorOrchestratorManifest({ probe: "vitest" })).not.toThrow();
  });

  it("IOM_POLICY_CELL_MAX is consolidation target (12)", () => {
    expect(IOM_POLICY_CELL_MAX).toBe(12);
  });

  it("logIomSelfHealProposal does not throw", () => {
    expect(() =>
      logIomSelfHealProposal({
        reason: "vitest probe",
        currentCellCount: 16,
        transmutationNote: "merge before add",
      }),
    ).not.toThrow();
  });
});
