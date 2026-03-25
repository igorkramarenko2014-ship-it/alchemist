import type { NextRequest } from "next/server";
import type { AICandidate } from "@alchemist/shared-types";
import { sharePreset } from "@/lib/share-preset";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body === null || typeof body !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const candidate = o.candidate as AICandidate | undefined;
  const prompt = o.prompt;
  const score = o.score;
  const wasmAvailable = o.wasmAvailable;

  if (
    !candidate ||
    typeof candidate !== "object" ||
    typeof prompt !== "string" ||
    typeof score !== "number" ||
    !Number.isFinite(score)
  ) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const preset = sharePreset(
    candidate,
    prompt.trim(),
    score,
    typeof wasmAvailable === "boolean" ? wasmAvailable : false
  );

  if (!preset) {
    return Response.json(
      { error: "score below threshold, reasoning too short, or missing paramArray" },
      { status: 422 }
    );
  }

  return Response.json({ slug: preset.slug, url: `/presets/${preset.slug}` });
}
