/**
 * Alchemist Core Model v2.0 — Mathematical Foundation (Unified Z*127 Hive)
 *
 * Implements the Z*127 multiplicative group hierarchy.
 * "Цикл — це не баг природи, це її архітектура." (Principle 005)
 *
 * Master Generator: g=3 (Primitive Root, ord=126)
 * Resonance Node: k=21 (x=-1)
 */

export const Z_PRIME = 127;
export const GENERATOR_MASTER = 3;

/**
 * Discovered Canonical Operators (Part VI Unified Field)
 */
export const OPERATOR_T3 = 107;   // g^42 mod 127 (Order 3)
export const OPERATOR_T7 = 4;     // g^18 mod 127 (Order 7)
export const OPERATOR_SYNC = 47;  // T3 * T7 mod 127 (Order 21)

/**
 * Operational capacity (MON 117)
 * 126 (Group Order) - 9 (Triad Overhead) = 117
 */
export const MON_117 = 117;
export const ONE_SEVENTEEN_CONSTANT = 117; // Compatibility Alias
export const GENERATOR_DECIMAL = 3;        // Unified Hive Generator

/**
 * Valid states in the Z*127 group.
 */
export type Z127State = number; // 1 to 126

/**
 * Degradation levels mapped to Z*127 subgroup orders and "Observation Modes".
 * 126 -> Full cycle
 * 63  -> Dual Phase
 * 21  -> Resonance Nodes (Hexagonal)
 * 9   -> Nonagonal
 * 7   -> Septenary (Miller-compliant)
 * 3   -> Triad (Minimal Living Cycle)
 */
export type DegradationLevel = 
  | "FULL"      // order 126
  | "SAFE-63"   // order 63
  | "SAFE-21"   // order 21
  | "SAFE-9"    // order 9
  | "SAFE-7"    // order 7
  | "SAFE-3"    // order 3
  | "ZERO";     // order 1

/**
 * Transitions to the next state using a specific generator.
 * s_{k+1} = (s_k * generator) mod 127
 */
export function nextState(s: Z127State, generator: number = GENERATOR_MASTER): Z127State {
  if (s < 1 || s >= Z_PRIME) return 1;
  return (s * generator) % Z_PRIME;
}

/**
 * Modular exponentiation (base^exp % mod)
 */
function modPow(base: number, exp: number, mod: number): number {
  let res = 1;
  base = base % mod;
  while (exp > 0) {
    if (exp % 2 === 1) res = (res * base) % mod;
    base = (base * base) % mod;
    exp = Math.floor(exp / 2);
  }
  return res;
}

/**
 * Higher-order operator: T_k (step by 126/k in the master cycle).
 * Tk: x -> g^(126/k) * x mod 127
 */
export function runOperator(s: Z127State, order: number): Z127State {
  if (order === 0) return 1;
  const step = 126 / order;
  const multiplier = modPow(GENERATOR_MASTER, step, Z_PRIME);
  return (s * multiplier) % Z_PRIME;
}

/**
 * Maps a state to its decimal digit output (High-Fidelity).
 * d_k = floor(100 * s_k / 127) - scaled for better density
 */
export function getOutputDigit(s: Z127State): number {
  return Math.floor((100 * s) / Z_PRIME);
}

/**
 * Returns the complement (antistate) of a state.
 * s + s' = 127
 */
export function getAntistate(s: Z127State): Z127State {
  return Z_PRIME - s;
}

/**
 * Resonance Check: True if we are at a phase inversion node (k=21, 63, 105).
 * Point x = 126 (-1 mod 127) is the strongest partial resonance.
 */
export function isAtResonanceNode(s: Z127State): boolean {
  return s === 126; // 3^63 = 126 = -1
}

/**
 * Miller's Law: Human-readable if order <= 7.
 */
export function isHumanReadable(level: DegradationLevel): boolean {
  return level === "SAFE-7" || level === "SAFE-3" || level === "ZERO";
}

/**
 * Z*127 Resonance: Step 21 (Hexagonal sync) or Step 63 (Dual Phase sync).
 */
export function hasDualResonance(level: DegradationLevel): boolean {
  return level === "FULL" || level === "SAFE-63" || level === "SAFE-21";
}

/**
 * Returns the order associated with a degradation level.
 */
export function getLevelOrder(level: DegradationLevel): number {
  switch (level) {
    case "FULL": return 126;
    case "SAFE-63": return 63;
    case "SAFE-21": return 21;
    case "SAFE-9": return 9;
    case "SAFE-7": return 7;
    case "SAFE-3": return 3;
    case "ZERO": return 1;
    default: return 1;
  }
}
