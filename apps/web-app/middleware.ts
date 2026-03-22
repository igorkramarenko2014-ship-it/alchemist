import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Request tracing for API routes (FIRE / FIRESTARTER handoff).
 * Forwards or assigns `x-request-id` on `/api/*`.
 */
export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const res = NextResponse.next();
  res.headers.set("x-request-id", requestId);
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
