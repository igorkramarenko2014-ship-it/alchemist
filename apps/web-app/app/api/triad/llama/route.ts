import { triadPanelPost } from "@/lib/triad-panel-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return triadPanelPost(request, "LLAMA");
}
