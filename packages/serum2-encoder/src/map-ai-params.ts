import type { Serum2Params } from "./encode.js";

/**
 * Map a 128-element AI `paramArray` into {@link Serum2Params}.
 * Indices 9+ are stored under `rawParams` as `p9`…`p127` for future wiring.
 */
export function mapAIParamsToSerum2(paramArray: number[]): Serum2Params {
  if (paramArray.length < 9) {
    throw new Error(`paramArray must have at least 9 elements, got ${paramArray.length}`);
  }

  const rawParams: Record<string, number> = {};
  for (let i = 9; i < paramArray.length; i++) {
    rawParams[`p${i}`] = paramArray[i]!;
  }

  return {
    presetName: "Alchemist Preset",
    filter: {
      freq: paramArray[0]!,
      reso: paramArray[1]!,
      drive: paramArray[2]!,
    },
    env0: {
      attack: paramArray[3]!,
      decay: paramArray[4]!,
      release: paramArray[5]!,
      curve1: paramArray[6]!,
    },
    env1: {
      release: paramArray[7]!,
      curve1: paramArray[8]!,
    },
    rawParams: Object.keys(rawParams).length > 0 ? rawParams : undefined,
  };
}
