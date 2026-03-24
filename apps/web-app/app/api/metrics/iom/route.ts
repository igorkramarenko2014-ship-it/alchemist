import { env } from "@/env";
import { collectIomPrometheusText, IOM_PROMETHEUS_CONTENT_TYPE } from "@/lib/iom-prometheus";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Prometheus text exposition for IOM (gauges only, derived from pulse + manifest).
 * **Operator-only:** same **`ALCHEMIST_OPS_TOKEN`** + **`X-Ops-Token`** as **`/api/health/iom`**.
 */
export async function GET(request: Request) {
  if (!env.alchemistOpsToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "iom_metrics_disabled",
        note: "Set ALCHEMIST_OPS_TOKEN to enable this route.",
      },
      { status: 503 },
    );
  }
  const token = request.headers.get("x-ops-token") ?? "";
  if (token !== env.alchemistOpsToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await collectIomPrometheusText(request.url);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": IOM_PROMETHEUS_CONTENT_TYPE,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "iom_metrics_collect_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
