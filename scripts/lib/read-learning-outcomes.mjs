/**
 * Non-authoritative `learningOutcomes` for AIOM / FIRE snapshots from
 * `artifacts/learning-fitness-report.json` (aggregator output).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_NOTE =
  "Defaults: missing or unreadable learning-fitness-report.json. Non-authoritative; does not affect MON or integrity.";

export function readLearningOutcomesFromFitnessReport(root) {
  const p = join(root, "artifacts", "learning-fitness-report.json");
  const defaults = {
    candidateSuccessRate: 0,
    meanBestScoreWithLessons: 0,
    orderChangeRate: 0,
    tasteClusterHitRate: 0,
    authoritative: false,
    sampleCount: 0,
    confidence: "low",
    note: DEFAULT_NOTE,
  };
  if (!existsSync(p)) return defaults;
  try {
    const j = JSON.parse(readFileSync(p, "utf8"));
    const lo = j.learningOutcomes;
    if (lo && typeof lo === "object") {
      return {
        candidateSuccessRate:
          typeof lo.candidateSuccessRate === "number" && Number.isFinite(lo.candidateSuccessRate)
            ? lo.candidateSuccessRate
            : 0,
        meanBestScoreWithLessons:
          typeof lo.meanBestScoreWithLessons === "number" && Number.isFinite(lo.meanBestScoreWithLessons)
            ? lo.meanBestScoreWithLessons
            : 0,
        orderChangeRate:
          typeof lo.orderChangeRate === "number" && Number.isFinite(lo.orderChangeRate)
            ? lo.orderChangeRate
            : 0,
        tasteClusterHitRate:
          typeof lo.tasteClusterHitRate === "number" && Number.isFinite(lo.tasteClusterHitRate)
            ? lo.tasteClusterHitRate
            : 0,
        authoritative: false,
        sampleCount:
          typeof lo.sampleCount === "number" && Number.isFinite(lo.sampleCount) ? lo.sampleCount : 0,
        confidence:
          lo.confidence === "high" || lo.confidence === "medium" || lo.confidence === "low"
            ? lo.confidence
            : "low",
        note: typeof lo.note === "string" && lo.note.length > 0 ? lo.note : DEFAULT_NOTE,
      };
    }
  } catch {
    /* ignore */
  }
  return defaults;
}
