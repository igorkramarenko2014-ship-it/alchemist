/**
 * Triad PNH attack memory — **explicit** partition key + optional JSONL audit trail (opt-in env).
 * No silent persistence: **`ALCHEMIST_PNH_HISTORY_JSONL=1`** only.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Partition = raw triad_intent + truncated forwarded-for (or `unknown-ip`). Inspectable in server config, not logged verbatim. */
export function triadIntentPnhPartition(request: Request): { storeKey: string; opaqueId: string } {
  const xf = request.headers.get("x-forwarded-for");
  const first = xf?.split(",")[0]?.trim();
  const ip = first && first.length > 0 ? first : "unknown-ip";
  const storeKey = `triad_intent:${ip.slice(0, 128)}`;
  const opaqueId = createHash("sha256").update(storeKey).digest("hex").slice(0, 16);
  return { storeKey, opaqueId };
}

export function resolveMonorepoRootForPnh(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 14; i++) {
    const pj = path.join(dir, "package.json");
    if (fs.existsSync(pj)) {
      try {
        const j = JSON.parse(fs.readFileSync(pj, "utf8")) as { name?: string; workspaces?: unknown };
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        /* continue */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function appendPnhHistoryJsonl(payload: Record<string, unknown>): void {
  if (process.env.ALCHEMIST_PNH_HISTORY_JSONL !== "1") return;
  const root = resolveMonorepoRootForPnh();
  if (root === null) return;
  const rel = process.env.ALCHEMIST_PNH_HISTORY_PATH ?? "tools/pnh-history.jsonl";
  const file = path.isAbsolute(rel) ? rel : path.join(root, rel);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify({ ts: new Date().toISOString(), ...payload })}\n`, "utf8");
  } catch {
    /* audit path optional — do not fail triad route */
  }
}
