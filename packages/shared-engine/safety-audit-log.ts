import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

import type { SafetyAuditEntry } from "./safety-state";

export type SafetyAuditLogRecord = SafetyAuditEntry & {
  prevHash: string | null;
  hash: string;
};

export function appendSafetyAuditLogRecord(
  path: string,
  entry: SafetyAuditEntry,
): SafetyAuditLogRecord {
  mkdirSync(dirname(path), { recursive: true });
  const records = readSafetyAuditLog(path);
  const prevHash = records.length > 0 ? records[records.length - 1].hash : null;
  const hash = computeSafetyAuditHash(entry, prevHash);
  const record: SafetyAuditLogRecord = { ...entry, prevHash, hash };
  appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export function readSafetyAuditLog(path: string): SafetyAuditLogRecord[] {
  try {
    const raw = readFileSync(path, "utf8").trim();
    if (raw.length === 0) return [];
    return raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as SafetyAuditLogRecord);
  } catch {
    return [];
  }
}

export function verifySafetyAuditLogIntegrity(records: readonly SafetyAuditLogRecord[]): boolean {
  let prevHash: string | null = null;
  for (const record of records) {
    if (record.prevHash !== prevHash) return false;
    const { hash, prevHash: recordPrevHash, ...entry } = record;
    if (computeSafetyAuditHash(entry, recordPrevHash) !== hash) return false;
    prevHash = hash;
  }
  return true;
}

function computeSafetyAuditHash(entry: SafetyAuditEntry, prevHash: string | null): string {
  return createHash("sha256")
    .update(JSON.stringify({ ...entry, prevHash }))
    .digest("hex");
}
