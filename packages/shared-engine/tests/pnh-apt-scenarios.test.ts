import { describe, expect, it } from "vitest";
import { PNH_APT_SCENARIO_CATALOG } from "../pnh/pnh-apt-scenarios";

describe("PNH APT-style catalog", () => {
  it("defines seven stable scenario records", () => {
    expect(PNH_APT_SCENARIO_CATALOG.length).toBe(7);
    const ids = PNH_APT_SCENARIO_CATALOG.map((s) => s.id);
    expect(new Set(ids).size).toBe(7);
  });

  it("uses expected canonical ids", () => {
    expect(PNH_APT_SCENARIO_CATALOG.map((s) => s.id).sort()).toEqual(
      [
        "bamboo_sprout",
        "dragons_breath",
        "empty_bowl",
        "jade_rabbit",
        "mirror_image",
        "paper_tiger",
        "silk_thread",
      ].sort(),
    );
  });
});
