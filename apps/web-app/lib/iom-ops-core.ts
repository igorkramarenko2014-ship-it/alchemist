import { env } from "@/env";
import { listOpenTriadCircuitPanelists } from "@/lib/triad-circuit-breakers";
import {
  analyzeTalentMarket,
  computeSoeRecommendations,
  getDefaultMarketBenchmarks,
  getIgorOrchestratorManifest,
  getIOMCoverageReport,
  getIOMHealthPulse,
} from "@alchemist/shared-engine";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface IomOpsTopSchism {
  code: string;
  severity: string;
  message: string;
}

export interface IomOpsCorePayload {
  igorOrchestrator: ReturnType<typeof getIgorOrchestratorManifest>;
  iomPulse: ReturnType<typeof getIOMHealthPulse>;
  recentAnomalies: ReturnType<typeof getIOMHealthPulse>["schisms"];
  operatorReviewSuggested: boolean;
  talentMarketAnalysis: {
    reason: string;
    gap: number;
    weakestPanelist: string | null;
    weakestScore: number | null;
    topMarketTalentId: string;
    agentAjiChatFusion: unknown;
  };
  /** Offline Vitest↔cell map when monorepo paths resolve from server cwd. */
  iomCoverage: ReturnType<typeof getIOMCoverageReport> | { unavailable: true; reason: string };
  iomPendingProposalCount: number;
  /** First line of SOE message (pulse SOE or nominal+IOM-weighted fallback). */
  iomSoeHintHead: string;
  iomTopSchisms: IomOpsTopSchism[];
  recommendedNext: string;
  note: string;
}

/**
 * Shared Igor + IOM + talent hints for **`/api/health/iom`** and **`/api/iom/dashboard`**.
 * Diagnostic only.
 */
export async function buildIomOpsCore(requestUrl: string): Promise<IomOpsCorePayload> {
  const wasmUrl = new URL("/api/health/wasm", requestUrl);
  let wasmOk = false;
  try {
    const wasmRes = await fetch(wasmUrl, { cache: "no-store" });
    const wasm = await wasmRes.json();
    const rec =
      typeof wasm === "object" && wasm !== null ? (wasm as Record<string, unknown>) : null;
    wasmOk = rec?.ok === true && rec?.status === "available";
  } catch {
    wasmOk = false;
  }

  const deepseekLive = env.deepseekApiKey.length > 0;
  const qwenLive = env.qwenApiKey.length > 0;
  const llamaLive = env.llamaApiKey.length > 0;
  const anyLive = deepseekLive || qwenLive || llamaLive;
  const allLive = deepseekLive && qwenLive && llamaLive;
  const liveList = [
    deepseekLive ? "deepseek" : null,
    qwenLive ? "qwen" : null,
    llamaLive ? "llama" : null,
  ].filter(Boolean) as string[];

  const iomPulse = getIOMHealthPulse({
    triad: {
      triadFullyLive: allLive,
      anyPanelistLive: anyLive,
      livePanelists: liveList,
    },
    wasmOk,
    openTriadCircuitPanelists: listOpenTriadCircuitPanelists(),
  });

  const talentInput = {
    triadHealthScore: iomPulse.soe?.triadHealthScore,
    benchmarks: getDefaultMarketBenchmarks(),
  };
  const talentMarket = analyzeTalentMarket(talentInput);

  const iomCoverage = tryLoadIomCoverageReport();
  const covScore =
    iomCoverage && "iomCoverageScore" in iomCoverage ? iomCoverage.iomCoverageScore : undefined;
  const schismCodes = iomPulse.schisms.map((s) => s.code);
  const fromPulseSoe = iomPulse.soe?.message?.split("\n")[0]?.trim();
  const iomSoeHintHead =
    fromPulseSoe ??
    computeSoeRecommendations(
      { meanPanelistMs: 0, triadFailureRate: 0, gateDropRate: 0 },
      {
        iomSchismCodes: schismCodes,
        ...(covScore != null && { iomCoverageScore: covScore }),
      },
    ).message.split("\n")[0] ??
    "";

  const crit = iomPulse.schisms.filter((s) => s.severity === "critical").length;
  const warn = iomPulse.schisms.filter((s) => s.severity === "warn").length;
  const proposals = countIomPendingHealProposals();
  const covForNext = covScore ?? 1;
  let recommendedNext: string;
  if (crit > 0 || warn > 0) {
    recommendedNext = "pnpm iom:status && pnpm verify:harsh — review schisms and triad/WASM telemetry";
  } else if (proposals > 0) {
    recommendedNext = "pnpm igor:apply — review pending heal proposals";
  } else if (covForNext < 0.85) {
    recommendedNext = "pnpm igor:heal — improve Vitest↔power-cell mapping";
  } else {
    recommendedNext = "pnpm iom:status — optional routine IOM snapshot";
  }

  const iomTopSchisms: IomOpsTopSchism[] = iomPulse.schisms.slice(0, 3).map((s) => ({
    code: s.code,
    severity: s.severity,
    message: s.message,
  }));

  return {
    igorOrchestrator: getIgorOrchestratorManifest(),
    iomPulse,
    recentAnomalies: iomPulse.schisms,
    operatorReviewSuggested: talentMarket.operatorReviewSuggested,
    talentMarketAnalysis: {
      reason: talentMarket.reason,
      gap: talentMarket.gap,
      weakestPanelist: talentMarket.weakestPanelist,
      weakestScore: talentMarket.weakestScore,
      topMarketTalentId: talentMarket.topMarketTalentId,
      agentAjiChatFusion: talentMarket.agentAjiChatFusion,
    },
    iomCoverage,
    iomPendingProposalCount: proposals,
    iomSoeHintHead,
    iomTopSchisms,
    recommendedNext,
    note:
      "Ops-only payload — diagnostic; no automatic routing changes. Talent hints require triadHealthScore in pulse (wire SOE snapshot on health route for richer signals).",
  };
}

function collectEngineTestRelPaths(engineRoot: string): string[] {
  const testsDir = join(engineRoot, "tests");
  const out: string[] = [];
  function walk(dir: string, prefix: string) {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
      const abs = join(dir, ent.name);
      if (ent.isDirectory()) walk(abs, rel);
      else if (ent.isFile() && ent.name.endsWith(".test.ts")) {
        out.push(`tests/${rel.split("\\").join("/")}`);
      }
    }
  }
  walk(testsDir, "");
  return Array.from(new Set(out)).sort();
}

export function countIomPendingHealProposals(): number {
  const candidates = [
    join(process.cwd(), "..", "..", "tools", "iom-proposals.jsonl"),
    join(process.cwd(), "tools", "iom-proposals.jsonl"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const lines = readFileSync(p, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let n = 0;
    for (const line of lines) {
      try {
        const o = JSON.parse(line) as { kind?: string };
        if (o?.kind === "iom_ghost_cell") n += 1;
      } catch {
        /* skip */
      }
    }
    return n;
  }
  return 0;
}

/** Offline Vitest↔cell coverage (local monorepo layout; may be unavailable in serverless). */
export function tryLoadIomCoverageReport():
  | ReturnType<typeof getIOMCoverageReport>
  | { unavailable: true; reason: string } {
  try {
    const root = join(process.cwd(), "..", "..");
    const engineRoot = join(root, "packages", "shared-engine");
    const cellsPath = join(engineRoot, "igor-power-cells.json");
    if (!existsSync(engineRoot) || !existsSync(cellsPath)) {
      return { unavailable: true, reason: "monorepo packages/shared-engine not adjacent to cwd" };
    }
    const cells = JSON.parse(readFileSync(cellsPath, "utf8")) as { id: string }[];
    if (!Array.isArray(cells)) {
      return { unavailable: true, reason: "igor-power-cells.json not an array" };
    }
    const executed = collectEngineTestRelPaths(engineRoot);
    return getIOMCoverageReport(cells, executed);
  } catch (e) {
    return { unavailable: true, reason: String(e) };
  }
}

export interface SnapshotRow {
  kind?: string;
  timestamp?: string;
  provenance?: string;
  manifestHash?: string;
  iomPulse?: { schisms?: { code: string }[]; suggestions?: unknown[] };
}

/** Last N JSONL rows from **`tools/iom-snapshots.jsonl`** (local dev / cron host). */
export function loadRecentIomSnapshots(maxLines = 100): {
  rows: SnapshotRow[];
  sourcePath: string | null;
} {
  const extra = process.env.IOM_SNAPSHOTS_FILE?.trim();
  const candidates = [
    extra,
    join(process.cwd(), "..", "..", "tools", "iom-snapshots.jsonl"),
    join(process.cwd(), "tools", "iom-snapshots.jsonl"),
  ].filter((p): p is string => !!p);

  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const tail = lines.slice(-maxLines);
    const rows: SnapshotRow[] = [];
    for (const line of tail) {
      try {
        rows.push(JSON.parse(line) as SnapshotRow);
      } catch {
        /* skip bad line */
      }
    }
    return { rows, sourcePath: p };
  }
  return { rows: [], sourcePath: null };
}

export function schismCodesTrend(rows: SnapshotRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    for (const s of r.iomPulse?.schisms ?? []) {
      counts[s.code] = (counts[s.code] ?? 0) + 1;
    }
  }
  return counts;
}
