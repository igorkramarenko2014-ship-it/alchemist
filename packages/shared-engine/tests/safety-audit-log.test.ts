import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { appendSafetyAuditLogRecord, readSafetyAuditLog, verifySafetyAuditLogIntegrity } from "../safety-audit-log";
import type { SafetyAuditEntry } from "../safety-state";

describe("safety audit log", () => {
  it("preserves append-only integrity with hash chaining", () => {
    const dir = mkdtempSync(join(tmpdir(), "safety-audit-"));
    const path = join(dir, "safety-audit.jsonl");

    const first: SafetyAuditEntry = {
      action: "WARNING_SHOWN",
      state: "WARNED",
      reason: "First warning.",
      behaviorSummary: "unsafe request",
      continueSafelyMessage: "stay within allowed use",
      timestampUtc: "2026-03-30T10:00:00.000Z",
      eventId: "evt1",
    };
    const second: SafetyAuditEntry = {
      action: "RESTRICTED_TEMP_ENABLED",
      state: "RESTRICTED_TEMP",
      reason: "Repeated warning escalation.",
      behaviorSummary: "repeated unsafe request",
      timestampUtc: "2026-03-30T10:01:00.000Z",
      durationMs: 60000,
      expiresAtUtc: "2026-03-30T10:02:00.000Z",
      restrictedCapabilities: ["triad_live_fetch"],
      eventId: "evt2",
    };

    appendSafetyAuditLogRecord(path, first);
    appendSafetyAuditLogRecord(path, second);
    const records = readSafetyAuditLog(path);

    expect(records).toHaveLength(2);
    expect(records[1]?.prevHash).toBe(records[0]?.hash ?? null);
    expect(verifySafetyAuditLogIntegrity(records)).toBe(true);
  });
});
