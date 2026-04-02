import { describe, expect, it } from "vitest";
import {
  Z_PRIME,
  GENERATOR_BINARY,
  GENERATOR_DECIMAL,
  nextState,
  getOutputDigit,
  getAntistate,
  isStateInSubgroup,
  getStateOrder,
  hasDualResonance,
  isHumanReadable,
} from "../core-model";

describe("Alchemist Core Model v1.0 — Z*29 Group", () => {
  it("verifies the group order is 28", () => {
    const states = new Set<number>();
    let s = 1;
    for (let i = 0; i < 28; i++) {
      states.add(s);
      s = nextState(s, GENERATOR_BINARY);
    }
    expect(states.size).toBe(28);
    expect(s).toBe(1); // Cycle closes at 28 steps
  });

  it("verifies the Decimal generator (g=10) is a primitive root", () => {
    const states = new Set<number>();
    let s = 1;
    for (let i = 0; i < 28; i++) {
      states.add(s);
      s = nextState(s, GENERATOR_DECIMAL);
    }
    expect(states.size).toBe(28);
    expect(s).toBe(1);
  });

  it("verifies the 1/29 decimal expansion cycle", () => {
    // 1/29 = 0.0344827...
    const expectedPrefix = [0, 3, 4, 4, 8, 2, 7, 5, 8, 6, 2, 0, 6, 8, 9, 6, 5, 5, 1, 7, 2, 4, 1, 3, 7, 9, 3, 1];
    let s = 1;
    const output: number[] = [];
    for (let i = 0; i < 28; i++) {
      output.push(getOutputDigit(s));
      s = nextState(s, GENERATOR_DECIMAL);
    }
    expect(output).toEqual(expectedPrefix);
  });

  it("verifies block complement symmetry (Bi + Bi+2 = 9999999)", () => {
    const s1 = 1;
    let s = s1;
    const digits: number[] = [];
    for (let i = 0; i < 28; i++) {
      digits.push(getOutputDigit(s));
      s = nextState(s, GENERATOR_DECIMAL);
    }

    // Split into 4 blocks of 7
    const b1 = digits.slice(0, 7);
    const b2 = digits.slice(7, 14);
    const b3 = digits.slice(14, 21);
    const b4 = digits.slice(21, 28);

    const sum13 = b1.map((d, i) => d + b3[i]);
    const sum24 = b2.map((d, i) => d + b4[i]);

    expect(sum13).toEqual([9, 9, 9, 9, 9, 9, 9]);
    expect(sum24).toEqual([9, 9, 9, 9, 9, 9, 9]);
  });

  it("verifies antistate complement (s + s' = 29)", () => {
    for (let s = 1; s < Z_PRIME; s++) {
      const sPrime = getAntistate(s);
      expect(s + sPrime).toBe(Z_PRIME);
    }
  });

  it("verifies subgroup membership", () => {
    // SAFE-4: {1, 12, 17, 28}
    const safe4 = [1, 12, 17, 28];
    safe4.forEach(s => expect(isStateInSubgroup(s, "SAFE-4")).toBe(true));
    expect(isStateInSubgroup(2, "SAFE-4")).toBe(false);

    // SAFE-7: {1, 7, 16, 20, 23, 24, 25}
    const safe7 = [1, 7, 16, 20, 23, 24, 25];
    safe7.forEach(s => expect(isStateInSubgroup(s, "SAFE-7")).toBe(true));
    expect(isStateInSubgroup(2, "SAFE-7")).toBe(false);
  });

  it("verifies dual resonance logic", () => {
    expect(hasDualResonance("FULL")).toBe(true);
    expect(hasDualResonance("SAFE-14")).toBe(false);
    expect(hasDualResonance("SAFE-7")).toBe(false);
  });

  it("verifies human readable (Miller-compliant) states", () => {
    expect(isHumanReadable("FULL")).toBe(false);
    expect(isHumanReadable("SAFE-14")).toBe(false);
    expect(isHumanReadable("SAFE-7")).toBe(true);
    expect(isHumanReadable("SAFE-4")).toBe(true);
    expect(isHumanReadable("ZERO")).toBe(true);
  });

  it("verifies state order detection", () => {
    expect(getStateOrder(1)).toBe(1);
    expect(getStateOrder(12)).toBe(4);
    expect(getStateOrder(7)).toBe(7);
    expect(getStateOrder(4)).toBe(14);
    expect(getStateOrder(2)).toBe(28);
  });
});
