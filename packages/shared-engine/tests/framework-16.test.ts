import { describe, it, expect } from 'vitest';
import { FRAMEWORK_OF_16, getPersonaMetadata } from '../personas/registry';
import { getPersonaContextAugmentation } from '../personas/persona-context';
import { getPersonaInfluenceSnapshot, recordPerspectiveSignal } from '../personas/persona-influence';
import { AMM_SPACES } from '../multimedium/room17/spaces';

describe('Framework of 16 — AMM Operational Integrity', () => {

  it('should have all 16 primary personas in the registry', () => {
    const ids = Object.keys(FRAMEWORK_OF_16);
    expect(ids.length).toBe(16);
    expect(ids).toContain('svitlana_v1');
    expect(ids).toContain('gleb_void');
    expect(ids).toContain('victor_strategy');
    expect(ids).toContain('zen_v1');
  });

  it('should retrieve correct metadata and bias for a persona', () => {
    const gleb = getPersonaMetadata('gleb_void');
    expect(gleb).toBeDefined();
    expect(gleb?.room).toBe(13);
    expect(gleb?.bias.novelty).toBe(0.3);
    expect(gleb?.bias.coherence).toBe(-0.2);
  });

  it('should augment context with all 16 persona role signals', () => {
    // Test a subset including new ones
    const ids = ['svitlana_v1', 'gleb_void', 'victor_strategy'];
    const aug = getPersonaContextAugmentation(ids, { enabled: true });
    
    expect(aug).not.toBeNull();
    expect(aug?.contextPrefix).toContain('SVITLANA_V1');
    expect(aug?.contextPrefix).toContain('GLEB_VOID');
    expect(aug?.contextPrefix).toContain('VICTOR_STRATEGY');
    expect(aug?.contextPrefix).toContain('Deconstruction / Minimalism / Essentialism');
    expect(aug?.contextPrefix).toContain('Strategy / Game Theory / Risk Mitigation');
  });

  it('should track and report numeric behavioral biases in influence snapshots', () => {
    const personaId = 'victor_strategy';
    recordPerspectiveSignal({
      personaId,
      tsMs: Date.now(),
      score: 0.9,
      activeLogics: ['L01_ILLUSION_BREAK'],
      signature: { pauseApplied: 1, flatteryResisted: 1, agencyReturned: 1, verbosityControlled: 1 }
    });

    const snapshot = getPersonaInfluenceSnapshot(personaId);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.biasAnalytics.coherence).toBe(0.3);
    expect(snapshot?.biasAnalytics.risk).toBe(-0.4);
    // Steering magnitude for victor: sqrt(0.1^2 + 0.3^2 + (-0.4)^2 + 0.0^2) = sqrt(0.01 + 0.09 + 0.16) = sqrt(0.26) approx 0.51
    expect(snapshot?.biasAnalytics.steeringMagnitude).toBeCloseTo(0.5099, 4);
  });

  it('should correspond directly with the AMM_SPACES definition', () => {
    expect(AMM_SPACES.length).toBe(17); // 16 rooms + 1 meta
    const room13 = AMM_SPACES.find(s => s.id === 'room-13');
    expect(room13?.name).toBe('Minimalist Void');
  });

});
