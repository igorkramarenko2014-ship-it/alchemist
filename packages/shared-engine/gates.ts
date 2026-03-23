/**
 * Segmented Slavic / adversarial calibration (Live Fire — March 2026).
 * Cosine = Slavic dedupe floor on paramArray; entropy = Shannon (10-bin) floor.
 */
export type GateSegment = "BASS" | "LEAD" | "DEFAULT";

const SEGMENT_THRESHOLDS: Record<GateSegment, { cosine: number; entropy: number }> = {
  BASS: { cosine: 0.82, entropy: 1.1 },
  LEAD: { cosine: 0.88, entropy: 1.6 },
  DEFAULT: { cosine: 0.85, entropy: 1.4 },
};

/**
 * LEAD before BASS so prompts like "pluck bass" classify as LEAD (stricter cosine / higher entropy).
 */
export function inferGateSegment(prompt: string): GateSegment {
  const p = prompt.toLowerCase();
  if (/\b(lead|pluck|key|melodic)\b/.test(p)) return "LEAD";
  if (/\b(bass|sub|808|909)\b/.test(p)) return "BASS";
  return "DEFAULT";
}

export function getSegmentCosineThreshold(segment: GateSegment): number {
  return SEGMENT_THRESHOLDS[segment].cosine;
}

export function getSegmentEntropyFloor(segment: GateSegment): number {
  return SEGMENT_THRESHOLDS[segment].entropy;
}

export function slavicCosineThresholdForPrompt(prompt?: string): number {
  if (prompt == null || prompt.trim().length === 0) {
    return getSegmentCosineThreshold("DEFAULT");
  }
  return getSegmentCosineThreshold(inferGateSegment(prompt));
}
