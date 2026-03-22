import { triadPanelPost } from "@/lib/triad-panel-route";

export async function POST(request: Request) {
  return triadPanelPost(request, "DEEPSEEK");
}
