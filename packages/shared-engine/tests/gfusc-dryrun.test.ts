import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import { appendGFUSCDryrunRecord, handleGFUSCVerdict, resolveGFUSCMode } from "../gfusc/dryrun";
import type { GFUSCSignalBundle } from "../gfusc/signals";
import type { GFUSCRunResult } from "../gfusc/verdict";

const ORIGINAL_ENV = { ...process.env };

const BUNDLE: GFUSCSignalBundle = {
  deployment: {
    operatorId: "operator",
    environment: "dev",
    apiConsumerScope: ["internal"],
    licensingDomain: "research",
  },
  usage: {
    triadCallPattern: ["triad", "share"],
    queryStructureHash: "abc123",
    outputRoutingTargets: ["ui"],
  },
  external: {
    licensingScopeAssertions: ["non_public"],
    domainCategoryFlags: ["civic"],
  },
  capturedAtUtc: "2026-03-30T00:00:00.000Z",
};

const BURN_RESULT: GFUSCRunResult = {
  vectorScores: [],
  harmIndex: 99,
  verdict: "BURN_CONDITION",
  triggeredVectors: ["CRITICAL_INFRA"],
  evaluatedAtUtc: "2026-03-30T00:00:01.000Z",
  scenarioId: "burn_case",
  source: "synthetic",
};

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("resolveGFUSCMode", () => {
  it("returns DRYRUN when NODE_ENV is not production", () => {
    process.env.NODE_ENV = "development";
    process.env.GFUSC_LIVE = "true";
    process.env.ALCHEMIST_KILLSWITCH_ARMED = "true";
    expect(resolveGFUSCMode()).toBe("DRYRUN");
  });

  it("returns DRYRUN when live flag is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.GFUSC_LIVE = "false";
    process.env.ALCHEMIST_KILLSWITCH_ARMED = "true";
    expect(resolveGFUSCMode()).toBe("DRYRUN");
  });

  it("returns DRYRUN when arm flag is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.GFUSC_LIVE = "true";
    process.env.ALCHEMIST_KILLSWITCH_ARMED = "false";
    expect(resolveGFUSCMode()).toBe("DRYRUN");
  });

  it("returns LIVE only when all three flags are set", () => {
    process.env.NODE_ENV = "production";
    process.env.GFUSC_LIVE = "true";
    process.env.ALCHEMIST_KILLSWITCH_ARMED = "true";
    expect(resolveGFUSCMode()).toBe("LIVE");
  });
});

describe("appendGFUSCDryrunRecord", () => {
  it("writes an append-only JSONL record with sanitized bundle data", () => {
    const dir = mkdtempSync(join(tmpdir(), "gfusc-dryrun-"));
    const path = join(dir, "gfusc-dryrun-log.jsonl");

    const record = appendGFUSCDryrunRecord(BURN_RESULT, BUNDLE, path);
    const line = readFileSync(path, "utf8").trim();
    const parsed = JSON.parse(line);

    expect(record.mode).toBe("DRYRUN");
    expect(parsed.signalBundle.deployment.operatorIdPresent).toBe(true);
    expect(parsed.signalBundle.usage.queryStructureHashPresent).toBe(true);
    expect(parsed.signalBundle.external.domainCategoryFlagsCount).toBe(1);
  });
});

describe("handleGFUSCVerdict", () => {
  it("does not attempt a live burn in DRYRUN and logs instead", () => {
    process.env.NODE_ENV = "development";
    const dir = mkdtempSync(join(tmpdir(), "gfusc-dryrun-"));
    const path = join(dir, "gfusc-dryrun-log.jsonl");
    const warn = vi.fn();
    const onLiveBurn = vi.fn();

    const outcome = handleGFUSCVerdict(BURN_RESULT, BUNDLE, {
      artifactPath: path,
      warn,
      onLiveBurn: onLiveBurn as unknown as (result: GFUSCRunResult) => never,
    });

    expect(outcome.action).toBe("logged");
    expect(onLiveBurn).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("returns clear outcome without log writes", () => {
    process.env.NODE_ENV = "development";
    const warn = vi.fn();

    const outcome = handleGFUSCVerdict(
      { ...BURN_RESULT, verdict: "CLEAR", harmIndex: 1, triggeredVectors: [] },
      BUNDLE,
      { warn },
    );

    expect(outcome).toEqual({ action: "clear", mode: "DRYRUN" });
    expect(warn).not.toHaveBeenCalled();
  });
});
