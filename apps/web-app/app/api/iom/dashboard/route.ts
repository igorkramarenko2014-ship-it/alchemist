import { env } from "@/env";
import { buildIomOpsCore, loadRecentIomSnapshots, schismCodesTrend } from "@/lib/iom-ops-core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Dedicated IOM ops JSON: core pulse + optional **`tools/iom-snapshots.jsonl`** tail + offline coverage.
 * Same auth as **`/api/health/iom`** (**`ALCHEMIST_OPS_TOKEN`** + **`X-Ops-Token`**).
 */
export async function GET(request: Request) {
  if (!env.alchemistOpsToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "iom_ops_disabled",
        note: "Set ALCHEMIST_OPS_TOKEN to enable this route.",
      },
      { status: 503 },
    );
  }
  const token = request.headers.get("x-ops-token") ?? "";
  if (token !== env.alchemistOpsToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const core = await buildIomOpsCore(request.url);
  const { rows, sourcePath } = loadRecentIomSnapshots(100);

  return NextResponse.json({
    ok: true,
    generatedAtMs: Date.now(),
    ...core,
    snapshots: {
      loadedCount: rows.length,
      sourcePath,
      schismCodeCountsAcrossSnapshots: schismCodesTrend(rows),
      recent: rows,
    },
    historyNote:
      "Suggestion acceptance rate is not tracked in-repo; use tools/iom-accepted-proposals/ locally if you archive applies.",
    canonicalHealthIomPath: "/api/health/iom",
  });
}
