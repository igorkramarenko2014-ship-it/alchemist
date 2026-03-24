import { getVstHealthSnapshot } from "@/lib/vst-bundle-health";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Optional **native VST3** build probe — same artifact path as **`pnpm build:vst`** / **`assert:vst`**.
 * Does **not** load the plugin or call Serum; filesystem only.
 */
export async function GET() {
  const s = getVstHealthSnapshot();
  return NextResponse.json({
    ok: s.ok,
    available: s.ok,
    status: s.status,
    version: s.bundleBasename ?? "unavailable",
    /** Reserved for IOM / `vst_observer` telemetry — not wired yet. */
    lastObservedMs: null,
    bundleBasename: s.bundleBasename,
    message: s.message,
    paths: {
      healthVst: "/api/health/vst",
      docs: "docs/vst-wrapper.md",
    },
  });
}
