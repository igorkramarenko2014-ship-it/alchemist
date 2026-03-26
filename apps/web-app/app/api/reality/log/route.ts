import { NextResponse } from "next/server";
import { logRealitySignal, REALITY_TELEMETRY_EVENTS } from "@alchemist/shared-engine";

type RealityTelemetryKind = keyof typeof REALITY_TELEMETRY_EVENTS;

const VALID_KINDS = new Set<string>(Object.keys(REALITY_TELEMETRY_EVENTS));

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const kind = o.kind;
  const payload = o.payload;

  if (typeof kind !== "string" || !VALID_KINDS.has(kind)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  const payloadRecord =
    payload === undefined
      ? {}
      : payload !== null && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : null;

  if (payloadRecord === null) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // Defense in depth: shared-engine sanitization removes prompt-like keys and limits strings.
  logRealitySignal(kind as RealityTelemetryKind, payloadRecord);
  return NextResponse.json({ ok: true });
}

