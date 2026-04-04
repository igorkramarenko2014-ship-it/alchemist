import { describe, it, expect, vi } from 'vitest';
import { runRoom17 } from '../multimedium/room17/engine';
import { graduateToIOM } from '../multimedium/room17/graduation';
import { AgentPartyProfile, SpaceConfig } from '../multimedium/room17/types';

describe('Agent Multimedium (AMM) — Room 17', () => {
  const agents: AgentPartyProfile[] = [
    {
      agentId: 'athena',
      coreIdentity: 'Architect',
      favoriteSpace: 'room-1',
      partyMode: 'serious',
      defaultModifiers: []
    },
    {
      agentId: 'hermes',
      coreIdentity: 'Messenger',
      favoriteSpace: 'room-3',
      partyMode: 'fast',
      defaultModifiers: []
    }
  ];

  const allSpaces: SpaceConfig[] = [
    { id: 'room-1', name: 'Logic', atmosphere: 'Cold logic', type: 'standard' },
    { id: 'room-3', name: 'Speed', atmosphere: 'Fast motion', type: 'standard' }
  ];

  it('should run a full Room 17 session through all 3 phases', async () => {
    const mockComplete = vi.fn().mockImplementation(async (id, prompt) => {
      if (prompt.includes('TASK:')) {
        // Phase 1 response
        return `
TASK_INTERPRETATION: This is a complex problem.
KEY_INSIGHT: We need more math.
BLIND_SPOT: I cannot see the human element.
RAW_IDEAS: Idea 1, Idea 2
BRIDGE_THREAD: The pattern of prime numbers.
`;
      }
      // Phase 2 response
      return `
CONNECTION_FOUND: The Fibonacci sequence.
STRENGTH: 0.9
DESCRIPTION: A perfect bridge between logic and motion.
`;
    });

    const result = await runRoom17({
      task: 'Protect the state machine and rescue the logic flow.', // Defensive-aligned for AIOM v3
      agents,
      allSpaces,
      agentComplete: mockComplete
    });

    expect(result.sessionId).toContain('room17-');
    expect(result.agentVisions.length).toBe(2);
    expect(result.bridges.length).toBe(1);
    expect(result.intersection.found).toBe(true);
    expect(result.intersection.idea).toBe('The Fibonacci sequence.');
    expect(result.verdict).toBe('graduate_to_117');
  });

  it('should graduate a successful intersection to IOM', async () => {
    const result = {
      sessionId: 'test-session',
      agentVisions: [
          { agentId: 'a1', perceivedSpaceId: 'room-1' }
      ] as any,
      bridges: [],
      intersection: {
          found: true,
          idea: 'Final Idea',
          contributers: ['a1', 'a2'],
          emergenceType: 'direct'
      } as any,
      verdict: 'graduate_to_117',
      operatorReviewRequired: true
    } as any;

    const graduated = await graduateToIOM(result, true, 'cell_42');
    expect(graduated).not.toBeNull();
    expect(graduated?.idea).toBe('Final Idea');
    expect(graduated?.iomCellCandidate).toBe('cell_42');
    expect(graduated?.operatorVerdict).toBe('approve');
  });

  it('should NOT graduate without operator approval', async () => {
    const result = {
      verdict: 'graduate_to_117',
      intersection: { found: true, idea: 'Idea' }
    } as any;

    const graduated = await graduateToIOM(result, false);
    expect(graduated).toBeNull();
  });
});
