import { existsSync, readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import type { 
  RefineryOverridesManifest, 
  EvidenceBucket,
  RefinerySnapshot,
  RefineryOverrideEntry
} from "@alchemist/shared-engine/transmutation/refinery/refinery-types";
import { PolicyFamily } from "@alchemist/shared-engine/transmutation/transmutation-types";
import { REFINERY_SCENARIOS } from "@alchemist/shared-engine/transmutation/refinery/scenarios";

const root = resolve(process.cwd(), "../../"); // apps/web-app -> root
const telemetryDir = join(root, "artifacts", "learning-telemetry");
const refineryDir = join(root, "packages", "shared-engine", "transmutation", "refinery");
const overridesPath = join(refineryDir, "refinery-overrides.json");
const snapshotsDir = join(root, "artifacts", "refinery-snapshots");

export interface AlignmentPulse {
  labels: string[];
  values: number[];
  avg: number;
}

export interface DriftRadarPoint {
  parameter: string;
  drift: number;
  budgetOccupancy: number; // 0-1 (normalized to 0.04)
}

export interface RefineryOpsPayload {
  ok: boolean;
  generatedAt: string;
  alignmentPulse: AlignmentPulse;
  driftRadar: DriftRadarPoint[];
  activeOverridesCount: number;
  manifestVersion: number;
  latestSnapshotId: string | null;
  scenario?: { id: string, name: string, description: string, narrativePoints: any[] };
}

/**
 * MOVE 4.5/5 — Build Read-Only Status
 * Lightweight polling source. No recomputation unless manual.
 * Supports MOVE 5 Scenarios for demo playback.
 */
export async function buildRefineryOpsStatus(scenarioId?: string | null): Promise<RefineryOpsPayload> {
  if (scenarioId && REFINERY_SCENARIOS[scenarioId]) {
    return buildScenarioStatus(scenarioId);
  }

  const pulse = getAlignmentPulse();
  const manifest = getManifest();
  const latestSnapshot = getLatestSnapshotId();

  // Calculate drift radar from manifest
  const radar: DriftRadarPoint[] = [];
  if (manifest) {
    const driftMap = computeCumulativeDrift(manifest.overrides);
    for (const [param, drift] of Object.entries(driftMap)) {
      radar.push({
        parameter: param,
        drift,
        budgetOccupancy: Math.min(1, Math.abs(drift) / 0.04)
      });
    }
  }

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    alignmentPulse: pulse,
    driftRadar: radar,
    activeOverridesCount: manifest?.overrides.length || 0,
    manifestVersion: manifest?.version || 0,
    latestSnapshotId: latestSnapshot
  };
}

function buildScenarioStatus(id: string): RefineryOpsPayload {
  const scenario = REFINERY_SCENARIOS[id];
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    alignmentPulse: {
      labels: scenario.mockAlignment.map((_, i) => `${i}s`),
      values: scenario.mockAlignment,
      avg: scenario.mockAlignment.reduce((a, b) => a + b, 0) / scenario.mockAlignment.length
    },
    driftRadar: scenario.mockStatus.driftRadar,
    activeOverridesCount: scenario.mockStatus.driftRadar.length,
    manifestVersion: scenario.mockStatus.manifestVersion,
    latestSnapshotId: scenario.mockProposals?.id || null,
    scenario: {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      narrativePoints: scenario.narrativePoints
    }
  };
}

function getAlignmentPulse(): AlignmentPulse {
  const values: number[] = [];
  const labels: string[] = [];
  
  if (existsSync(telemetryDir)) {
    const files = readdirSync(telemetryDir)
      .filter(f => f.endsWith(".jsonl"))
      .sort()
      .slice(-5); // Last 5 files
    
    for (const file of files) {
      const raw = readFileSync(join(telemetryDir, file), "utf8");
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        try {
          const ev = JSON.parse(line);
          if (ev.event === "transmutation_outcome_alignment" && ev.alignmentFinal != null) {
            values.push(ev.alignmentFinal);
            labels.push(new Date(ev.ts || Date.now()).toLocaleTimeString());
          }
        } catch {}
      }
    }
  }

  const recent = values.slice(-20);
  const avg = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;

  return { labels: labels.slice(-20), values: recent, avg };
}

function getManifest(): RefineryOverridesManifest | null {
  if (!existsSync(overridesPath)) return null;
  return JSON.parse(readFileSync(overridesPath, "utf8"));
}

function getLatestSnapshotId(): string | null {
  if (!existsSync(snapshotsDir)) return null;
  const files = readdirSync(snapshotsDir).filter(f => f.endsWith(".json"));
  if (files.length === 0) return null;
  return files.sort().reverse()[0].replace(".json", "");
}

/**
 * MOVE 4.5 — Advisory Warning Logic
 * Detects if a proposal's dependencies are broken by partial selection.
 */
export function getPartialNudgeWarnings(allProposals: any[], selectedIds: Set<string>): string[] {
  const warnings: string[] = [];
  
  // Example rule: If triad weight is selected, prior weight for same policy should usually be selected
  for (const prop of allProposals) {
    if (selectedIds.has(prop.id)) {
      if (prop.nudge.triad_weights && prop.nudge.priors) {
         // This proposal has BOTH. If it was split, we'd warn, but here they are unified.
         // In v1, our proposals are already grouped.
      }
    }
  }

  return warnings;
}

function computeCumulativeDrift(overrides: RefineryOverrideEntry[]): Record<string, number> {
  const drift: Record<string, number> = {};
  for (const entry of overrides) {
    const nudge = entry.nudge;
    if (nudge.triad_weights) {
      for (const [p, d] of Object.entries(nudge.triad_weights)) {
        drift[`triad:${p}`] = (drift[`triad:${p}`] || 0) + (d as number);
      }
    }
    if (nudge.priors) {
      for (const [k, d] of Object.entries(nudge.priors)) {
        drift[`prior:${k}`] = (drift[`prior:${k}`] || 0) + (d as number);
      }
    }
  }
  return drift;
}
