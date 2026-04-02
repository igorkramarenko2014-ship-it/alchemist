import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getIgorOrchestratorManifest, type IgorOrchestratorPowerCell } from "../igor-orchestrator-layer";

describe("mentor_grounding_core cell", () => {
  it("artifacts are present on disk", () => {
    const manifest = getIgorOrchestratorManifest();
    const cell = manifest.sharedEnginePowerCells.find((c: IgorOrchestratorPowerCell) => c.id === "mentor_grounding_core");
    expect(cell).toBeDefined();

    cell?.artifacts.forEach((relativeArtifactPath: string) => {
      // In Vitest, __dirname is 'packages/shared-engine/tests'
      const absolutePath = path.resolve(__dirname, "..", relativeArtifactPath);
      expect(fs.existsSync(absolutePath)).toBe(true);
      
      const content = fs.readFileSync(absolutePath, "utf8");
      if (relativeArtifactPath.includes("inner-circle-agent.md")) {
        expect(content).toContain("Natalia Grounding Pattern");
        expect(content).toContain("Любченко Pattern");
      }
    });
  });
});
