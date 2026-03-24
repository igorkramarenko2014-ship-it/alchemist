import { afterEach, describe, expect, it } from "vitest";
import { getIOMHealthPulse } from "../iom-pulse";
import {
  getVstWrapperPulseSlice,
  recordVstWrapperPulseHint,
  resetVstWrapperPulseForTests,
} from "../vst-wrapper-pulse";

afterEach(() => {
  resetVstWrapperPulseForTests();
});

describe("vst-wrapper pulse", () => {
  it("getIOMHealthPulse includes vstWrapperStatus defaults", () => {
    const p = getIOMHealthPulse({});
    expect(p.vstWrapperStatus.lastFxpLoaded).toBeNull();
    expect(p.vstWrapperStatus.lastLoadResult).toBeNull();
    expect(p.vstWrapperStatus.daemonRunning).toBe(false);
    expect(p.vstWrapperStatus.stance).toBe("CONSOLIDATE");
  });

  it("recordVstWrapperPulseHint updates slice", () => {
    recordVstWrapperPulseHint({
      path: "/tmp/trial.fxp",
      result: "success",
      message: "ok",
      provenance: "vitest",
    });
    const s = getVstWrapperPulseSlice();
    expect(s.lastFxpLoaded).toBe("/tmp/trial.fxp");
    expect(s.lastLoadResult).toBe("success");
    expect(s.lastMessage).toBe("ok");
  });
});
