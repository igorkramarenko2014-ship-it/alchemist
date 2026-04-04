import { describe, it, expect } from 'vitest';
import { 
  Z_PRIME, 
  GENERATOR_MASTER, 
  OPERATOR_T3,
  OPERATOR_T7,
  OPERATOR_SYNC,
  MON_117,
  nextState, 
  runOperator, 
  getLevelOrder,
  isAtResonanceNode 
} from '../core-model';

describe('Alchemist Core Model v2.0 (Z*127)', () => {
  it('should have the correct prime modulus', () => {
    expect(Z_PRIME).toBe(127);
  });

  it('should have g=3 as the master generator', () => {
    expect(GENERATOR_MASTER).toBe(3);
  });

  it('should verify g=3 is a primitive root (order 126)', () => {
    let state = 1;
    const visited = new Set<number>();
    
    // Iterate 126 times
    for (let i = 0; i < 126; i++) {
      state = nextState(state, GENERATOR_MASTER);
      visited.add(state);
    }
    
    expect(visited.size).toBe(126);
    expect(state).toBe(1); // Cycle closure
  });

  it('should identify the phase-inversion resonance node (k=21, x=126)', () => {
    // 3^63 should be 126 (-1 mod 127)
    let state = 1;
    for (let i = 0; i < 63; i++) {
        state = nextState(state, GENERATOR_MASTER);
    }
    expect(state).toBe(126);
    expect(isAtResonanceNode(state)).toBe(true);
  });

  it('should match the canonical Part VI operators', () => {
    expect(OPERATOR_T3).toBe(107);
    expect(OPERATOR_T7).toBe(4);
    expect(OPERATOR_SYNC).toBe(47);
    expect(MON_117).toBe(117);
  });

  it('should correctly run the T3 (Triad) operator', () => {
    const firstStep = runOperator(1, 3);
    expect(firstStep).toBe(OPERATOR_T3);
    
    // Canonical Triad 1: 1 -> 107 -> 19 -> 1
    const secondStep = runOperator(firstStep, 3);
    expect(secondStep).toBe(19);
    const thirdStep = runOperator(secondStep, 3);
    expect(thirdStep).toBe(1);
  });

  it('should correctly run the T7 (Septenary) operator', () => {
    // T7: order 7 -> step 126/7 = 18
    const firstStep = runOperator(1, 7);
    
    let expected = 1;
    for (let i = 0; i < 18; i++) {
      expected = (expected * 3) % 127;
    }
    expect(firstStep).toBe(expected);

    // Verify it forms a 7-cycle
    let state = 1;
    for (let i = 0; i < 7; i++) {
        state = runOperator(state, 7);
    }
    expect(state).toBe(1);
  });

  it('should identify the resonance point between 3 and 7 cycles', () => {
    // 21 is a multiple of 3 and 7.
    // In Z*127, they "meet" through the Master cycle.
    // k=21 node is a state reachable by both in proportional steps.
    
    // T3 (order 3) step is 42.
    // T7 (order 7) step is 18.
    // LCM(42, 18) = 126.
    
    // Thus, they only meet at 0 (full resonance) or indirectly via 21 nodes.
    const order21Step = 126 / 21; // 6
    const multiplier21 = Math.pow(3, 6) % 127; // 729 % 127 = 94
    
    expect(runOperator(1, 21)).toBe(94);
  });
});
