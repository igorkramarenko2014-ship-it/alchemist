/**
 * Write UTF-8 JSON/text atomically: temp file in same directory, then rename (POSIX same-fs atomic).
 * Reduces CI / concurrent read partial-write risk vs direct overwrite.
 */
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * @param {string} targetAbsPath
 * @param {string} bodyUtf8
 */
export function writeUtf8FileAtomic(targetAbsPath, bodyUtf8) {
  mkdirSync(dirname(targetAbsPath), { recursive: true });
  const tmp = join(dirname(targetAbsPath), `.${Date.now()}.${process.pid}.tmp`);
  writeFileSync(tmp, bodyUtf8, "utf8");
  renameSync(tmp, targetAbsPath);
}
