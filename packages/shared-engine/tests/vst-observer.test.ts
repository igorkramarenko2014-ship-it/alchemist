import { describe, expect, it, afterEach } from "vitest";
import { getIOMHealthPulse } from "../iom-pulse";
import {
  getVstObserverPulseSlice,
  recordVstObserverSync,
  resetVstObserverStateForTests,
  setVstObserverStance,
} from "../vst-observer";

describe("vst_observer (IOM diagnostic slice)", () => {
  afterEach(() => {
    resetVstObserverStateForTests();
  });

  it("pulse includes vstSyncStatus with defaults", () => {
    const p = getIOMHealthPulse({});
    expect(p.vstSyncStatus.lastSync).toBeNull();
    expect(p.vstSyncStatus.lastResult).toBeNull();
    expect(p.vstSyncStatus.stance).toBe("CONSOLIDATE");
    expect(p.vstSyncStatus.pendingTrial).toBe(false);
  });

  it("recordVstObserverSync updates pulse slice", () => {
    setVstObserverStance("DISRUPT");
    recordVstObserverSync({
      success: true,
      validated: true,
      fxpPath: "/tmp/alchemist_trial.fxp",
      pushedAt: "2026-03-24T12:00:00.000Z",
      provenance: "vitest",
    });
    const slice = getVstObserverPulseSlice();
    expect(slice.stance).toBe("DISRUPT");
    expect(slice.lastSync).toBe("2026-03-24T12:00:00.000Z");
    expect(slice.pendingTrial).toBe(true);
    expect(getIOMHealthPulse({}).vstSyncStatus.lastResult?.fxpPath).toBe("/tmp/alchemist_trial.fxp");
  });
});
