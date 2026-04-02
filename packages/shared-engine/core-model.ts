/**
 * Alchemist Core Model v1.0 — Mathematical Foundation
 *
 * Implements the Z*29 multiplicative group state machine.
 * Provides Dual-Base Resonance (Binary/Decimal generators) and Subgroup logic.
 */

export const Z_PRIME = 29;

/**
 * Valid states in the Z*29 group.
 */
export type Z29State = number; // 1 to 28

/**
 * Degradation levels mapped to Z*29 subgroup orders.
 */
export type DegradationLevel = "FULL" | "SAFE-14" | "SAFE-7" | "SAFE-4" | "ZERO";

/**
 * Core engine generators.
 * Binary (Execution): g=2
 * Decimal (Interpretation): g=10
 */
export const GENERATOR_BINARY = 2;
export const GENERATOR_DECIMAL = 10;

/**
 * Subgroup element sets (pre-calculated for efficiency).
 */
export const SUBGROUP_14 = new Set([1, 4, 5, 6, 7, 9, 13, 16, 20, 22, 23, 24, 25, 28]);
export const SUBGROUP_7 = new Set([1, 7, 16, 20, 23, 24, 25]);
export const SUBGROUP_4 = new Set([1, 12, 17, 28]);
export const SUBGROUP_1 = new Set([1]);

/**
 * Transitions to the next state using a specific generator.
 * s_{k+1} = (s_k * generator) mod 29
 */
export function nextState(s: Z29State, generator: number): Z29State {
  if (s < 1 || s >= Z_PRIME) return 1;
  return (s * generator) % Z_PRIME;
}

/**
 * Maps a state to its decimal digit output (long division).
 * d_k = floor(10 * s_k / 29)
 */
export function getOutputDigit(s: Z29State): number {
  return Math.floor((10 * s) / Z_PRIME);
}

/**
 * Returns the complement (antistate) of a state.
 * s + s' = 29
 */
export function getAntistate(s: Z29State): Z29State {
  return Z_PRIME - s;
}

/**
 * Checks if a state belongs to a specific subgroup.
 */
export function isStateInSubgroup(s: Z29State, level: DegradationLevel): boolean {
  switch (level) {
    case "FULL":
      return s >= 1 && s <= 28;
    case "SAFE-14":
      return SUBGROUP_14.has(s);
    case "SAFE-7":
      return SUBGROUP_7.has(s);
    case "SAFE-4":
      return SUBGROUP_4.has(s);
    case "ZERO":
      return SUBGROUP_1.has(s);
    default:
      return false;
  }
}

/**
 * Returns the order of the minimal subgroup containing the given state.
 */
export function getStateOrder(s: Z29State): number {
  if (s === 1) return 1;
  if (SUBGROUP_4.has(s)) return 4;
  if (SUBGROUP_7.has(s)) return 7;
  if (SUBGROUP_14.has(s)) return 14;
  return 28;
}

/**
 * Resonance Check: True if both Binary and Decimal engines are valid in the current state space.
 * THYOREM: Resonance exists if and only if |S| = 28.
 */
export function hasDualResonance(level: DegradationLevel): boolean {
  return level === "FULL";
}

/**
 * Human Readable Mode (Miller's Law): Miller-compliant if |S| <= 7.
 */
export function isHumanReadable(level: DegradationLevel): boolean {
  return level === "SAFE-7" || level === "SAFE-4" || level === "ZERO";
}
