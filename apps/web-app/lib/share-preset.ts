import { customAlphabet } from "nanoid";

const nanoidSlug = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 6);
import type { AICandidate } from "@alchemist/shared-types";
import type { SharedPreset } from "@alchemist/shared-types";
import {
  getGateIntegrityFailure,
  logEvent,
  logRealitySignal,
  PANELIST_ALCHEMIST_CODENAME,
} from "@alchemist/shared-engine";
import { saveSharedPreset } from "./preset-store";

const SHARE_SCORE_FLOOR = 0.85;
const IOM_ALLOW_STUB_LEARNING = process.env.ALCHEMIST_IOM_ALLOW_STUB_LEARNING === "1";

interface SharePresetOptions {
  learningEligible?: boolean;
}

function slugBaseFromPrompt(prompt: string): string {
  const base = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return base.length > 0 ? base : "preset";
}

export function sharePreset(
  candidate: AICandidate,
  prompt: string,
  score: number,
  wasmAvailable: boolean,
  options?: SharePresetOptions
): SharedPreset | null {
  if (score < SHARE_SCORE_FLOOR) {
    return null;
  }
  if (getGateIntegrityFailure(candidate) !== null) {
    return null;
  }

  const reasoning = candidate.reasoning?.trim() ?? "";
  if (reasoning.length < 15) {
    return null;
  }

  const params = candidate.paramArray;
  if (!Array.isArray(params) || params.length === 0) {
    return null;
  }

  const slug = `${slugBaseFromPrompt(prompt)}-${nanoidSlug()}`;
  const codename = PANELIST_ALCHEMIST_CODENAME[candidate.panelist];

  const preset: SharedPreset = {
    slug,
    prompt,
    description: candidate.description?.trim() ?? "",
    reasoning,
    paramArray: [...params].slice(0, 128),
    score,
    panelist: codename,
    sharedAt: new Date().toISOString(),
    wasmAvailable,
  };

  saveSharedPreset(preset);
  const learningEligible = (options?.learningEligible ?? true) || IOM_ALLOW_STUB_LEARNING;

  // Reality Loop: user-consented share event (outcome signal).
  logRealitySignal("PRESET_SHARED", {
    surface: "share",
    slug,
    score,
    panelist: candidate.panelist,
    learningEligible,
    learningPolicy: learningEligible ? "live_only_default" : "stub_blocked_unless_iom",
  });
  // OUTPUT_USED is a learning signal; block stub-lane cases unless IOM explicitly allows.
  if (learningEligible) {
    logRealitySignal("OUTPUT_USED", {
      surface: "share",
      panelist: candidate.panelist,
      learningEligible: true,
      learningPolicy: "live_only_default",
    });
  }

  logEvent("preset_shared", {
    slug,
    score,
    panelist: preset.panelist,
    promptLength: prompt.length,
  });

  return preset;
}
