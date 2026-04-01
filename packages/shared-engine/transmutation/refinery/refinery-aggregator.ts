import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { 
  EvidenceBucket, 
  RefinerySnapshot, 
  RefineryOverrideEntry,
  RefineryOverridesManifest
} from "./refinery-types";
import { calibrateRefinery } from "./refinery-calibrator";

// Path resolution (monorepo root)
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../../../"); // packages/shared-engine/transmutation/refinery -> packages/shared-engine -> packages -> root
const telemetryDir = join(root, "artifacts", "learning-telemetry");

/**
 * MOVE 4 Aggregator
 * Processes JSONL telemetry into EvidenceBuckets.
 * Guards: sampleCount >= 20, meanConfidence >= 0.5.
 */
export function aggregateRefineryEvidence(): EvidenceBucket[] {
  if (!existsSync(telemetryDir)) return [];

  const files = readdirSync(telemetryDir).filter((f: string) => f.endsWith(".jsonl"));
  const buckets = new Map<string, {
    count: number;
    sumAlignment: number;
    sumConfidence: number;
    sumGain: number;
    meta: any;
  }>();

  for (const file of files) {
    const raw = readFileSync(join(telemetryDir, file), "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.event !== "transmutation_outcome_alignment") continue;

        // Grouping key: [policyFamily, taskType, cluster, status]
        const policy = ev.policyFamily || "none";
        const task = ev.taskSchemaSnapshot?.task_type || "unknown";
        const cluster = ev.taskSchemaSnapshot?.cluster || "null";
        const status = ev.status || "disabled";
        const key = `${policy}|${task}|${cluster}|${status}`;

        if (!buckets.has(key)) {
          buckets.set(key, {
            count: 0,
            sumAlignment: 0,
            sumConfidence: 0,
            sumGain: 0,
            meta: { policy, task, cluster, status }
          });
        }

        const b = buckets.get(key)!;
        b.count++;
        b.sumAlignment += ev.alignmentFinal || 0;
        b.sumConfidence += ev.alignmentConfidence || 0;
        b.sumGain += ev.alignmentGainV1 || 0;
      } catch {
        // Skip malformed lines
      }
    }
  }

  const result: EvidenceBucket[] = [];
  for (const b of Array.from(buckets.values())) {
    const meanConfidence = b.sumConfidence / b.count;
    
    // MOVE 4 Guards: Ensure signal quality
    if (b.count >= 20 && meanConfidence >= 0.5) {
      result.push({
        policyFamily: b.meta.policy,
        taskType: b.meta.task,
        cluster: b.meta.cluster === "null" ? null : b.meta.cluster,
        status: b.meta.status,
        sampleCount: b.count,
        meanAlignment: b.sumAlignment / b.count,
        meanAlignmentConfidence: meanConfidence,
        meanAlignmentGainV1: b.sumGain / b.count
      });
    }
  }

  return result;
}

/**
 * MOVE 4.5 — Generate Stable Snapshot
 * Runs the full refinery loop and freezes the output for review.
 */
export function generateProposalsSnapshot(): RefinerySnapshot {
  const evidence = aggregateRefineryEvidence();
  const rawProposals = calibrateRefinery(evidence);
  
  const now = new Date();
  const id = `snap_${now.toISOString().replace(/[:.-]/g, "_")}`;
  
  const snapshot: RefinerySnapshot = {
    id,
    createdAtUtc: now.toISOString(),
    proposals: rawProposals.map((p, i) => ({
      ...p,
      id: `${id}_nudge_${i}` // Stable ID within this snapshot
    }))
  };

  saveRefinerySnapshot(snapshot);
  return snapshot;
}

function saveRefinerySnapshot(snapshot: RefinerySnapshot): void {
  const snapshotDir = join(root, "artifacts", "refinery-snapshots");
  if (!existsSync(snapshotDir)) {
    mkdirSync(snapshotDir, { recursive: true });
  }
  const dest = join(snapshotDir, `${snapshot.id}.json`);
  writeFileSync(dest, JSON.stringify(snapshot, null, 2), "utf8");
}

/**
 * MOVE 4.5 — Load Stable Snapshot
 */
export function loadRefinerySnapshot(snapshotId: string): RefinerySnapshot | null {
  const snapshotDir = join(root, "artifacts", "refinery-snapshots");
  const p = join(snapshotDir, `${snapshotId}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

/**
 * MOVE 4.5 — Commit Selected Proposals
 * Merges selected nudges from a snapshot into the main manifest.
 */
export function commitRefineryProposals(snapshotId: string, selectedIds: string[]): { count: number; version: number } {
  const snapshot = loadRefinerySnapshot(snapshotId);
  if (!snapshot) throw new Error(`Snapshot not found: ${snapshotId}`);

  const selected = snapshot.proposals.filter(p => selectedIds.includes(p.id));
  if (selected.length === 0) return { count: 0, version: 0 };

  const refineryDir = join(root, "packages", "shared-engine", "transmutation", "refinery");
  const overridesPath = join(refineryDir, "refinery-overrides.json");

  let manifest: RefineryOverridesManifest = { 
    version: 0, 
    lastUpdateUtc: new Date().toISOString(), 
    overrides: [], 
    cumulativeDriftCache: {} 
  };
  
  if (existsSync(overridesPath)) {
    manifest = JSON.parse(readFileSync(overridesPath, "utf8"));
  }

  manifest.version++;
  manifest.lastUpdateUtc = new Date().toISOString();
  
  // Merge selected nudges
  // Note: provenance.version in entries matches manifest.version at time of apply
  for (const p of selected) {
    const { id, ...cleanProposal } = p; // remove the transient snapshot ID
    manifest.overrides.push({
      ...cleanProposal,
      provenance: {
        ...cleanProposal.provenance,
        version: manifest.version,
        timestamp: manifest.lastUpdateUtc
      }
    });
  }

  writeFileSync(overridesPath, JSON.stringify(manifest, null, 2), "utf8");
  return { count: selected.length, version: manifest.version };
}

/**
 * MOVE 4.5 — Reset/Rollback
 */
export function rollbackRefineryOverrides(): void {
  const refineryDir = join(root, "packages", "shared-engine", "transmutation", "refinery");
  const overridesPath = join(refineryDir, "refinery-overrides.json");
  const manifest: RefineryOverridesManifest = { 
    version: 0, 
    lastUpdateUtc: new Date().toISOString(), 
    overrides: [], 
    cumulativeDriftCache: {} 
  };
  writeFileSync(overridesPath, JSON.stringify(manifest, null, 2), "utf8");
}
