/**
 * Stub vs live **`runTriad`** snapshot diff for a tiny fixed corpus — stdout JSON for operators / CI artifacts.
 * Live path runs only when fetcher keys are set (same contract as **`GET /api/health`** triad flags).
 */
import {
  buildTriadParityHarnessRecord,
  diffTriadParitySnapshots,
  makeTriadFetcher,
  runTriad,
  snapshotTriadAnalysis,
} from "@alchemist/shared-engine";

const CORPUS = [
  "triad parity harness pad sharp bass — deterministic token shape for cross-mode comparison.",
  "parity corpus B — minimal pluck lead with short decay.",
  "parity corpus C — wide supersaw pad with filter emphasis.",
];

function keysPresent(): boolean {
  return Boolean(
    process.env.DEEPSEEK_API_KEY &&
      (process.env.GROQ_API_KEY || process.env.LLAMA_API_KEY) &&
      process.env.QWEN_API_KEY,
  );
}

function triadBaseUrl(): string {
  const u = process.env.TRIAD_PARITY_BASE_URL || process.env.BASE_URL || "http://127.0.0.1:3000";
  return u.replace(/\/$/, "");
}

async function main() {
  const records: Record<string, unknown>[] = [];

  for (const prompt of CORPUS) {
    const stub = await runTriad(prompt, { skipTablebase: true });
    const sStub = snapshotTriadAnalysis("stub", stub);

    if (!keysPresent()) {
      records.push(buildTriadParityHarnessRecord(prompt, [sStub], []));
      continue;
    }

    const fetcher = makeTriadFetcher(false, triadBaseUrl());
    try {
      const live = await runTriad(prompt, { fetcher, skipTablebase: true });
      const sLive = snapshotTriadAnalysis("live_fetcher", live);
      const diff = diffTriadParitySnapshots(sStub, sLive);
      records.push(buildTriadParityHarnessRecord(prompt, [sStub, sLive], [diff]));
    } catch (e) {
      records.push({
        ...buildTriadParityHarnessRecord(prompt, [sStub], []),
        liveError: e instanceof Error ? e.message : String(e),
        liveBaseUrl: triadBaseUrl(),
      });
    }
  }

  const out = {
    event: "triad_parity_diff_report",
    generatedAt: new Date().toISOString(),
    liveEvaluated: keysPresent(),
    prompts: CORPUS.length,
    records,
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
