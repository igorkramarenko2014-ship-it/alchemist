import { env } from "@/env";
import { 
  buildRefineryOpsStatus 
} from "@/lib/refinery-ops-core";
import { 
  generateProposalsSnapshot, 
  commitRefineryProposals, 
  rollbackRefineryOverrides 
} from "@alchemist/shared-engine/transmutation/refinery/refinery-aggregator";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * MOVE 4.5 — Refinery Ops API
 * Gated by ALCHEMIST_OPS_TOKEN + X-Ops-Token.
 */
export async function GET(request: Request) {
  const auth = checkAuth(request);
  if (auth) return auth;

  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "status";
  const scenarioId = url.searchParams.get("scenario");

  if (action === "status") {
    const status = await buildRefineryOpsStatus(scenarioId);
    return NextResponse.json(status);
  }

  return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
}

export async function POST(request: Request) {
  const auth = checkAuth(request);
  if (auth) return auth;

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    if (action === "aggregate") {
      // Manual trigger for recomputation
      const snapshot = generateProposalsSnapshot();
      return NextResponse.json({ ok: true, snapshot });
    }

    if (action === "apply") {
      // Selective nudge apply
      const body = await request.json();
      const { snapshotId, selectedIds } = body;
      
      if (!snapshotId || !Array.isArray(selectedIds)) {
        return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
      }

      const result = commitRefineryProposals(snapshotId, selectedIds);
      return NextResponse.json({ ok: true, ...result });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }

  return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const auth = checkAuth(request);
  if (auth) return auth;

  rollbackRefineryOverrides();
  return NextResponse.json({ ok: true, message: "Overrides cleared" });
}

function checkAuth(request: Request) {
  if (!env.alchemistOpsToken) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 503 });
  }
  const token = request.headers.get("x-ops-token");
  if (token !== env.alchemistOpsToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}
