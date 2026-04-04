import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runRoom17, activateAnton } from '../multimedium/room17/engine';
import { AntonInfrastructure } from '../multimedium/room17/anton-infra';

describe('Anton Activation & Infra-Paths', () => {
    
    const mockAgentComplete = vi.fn().mockImplementation(async (id: string, prompt: string) => {
        if (prompt.includes('BRIDGE_CERTAINTY')) {
            return 'CONNECTION_FOUND: Valid Bridge\nSTRENGTH: 0.95\nDESCRIPTION: Verified rescue path.';
        }
        return 'TASK_INTERPRETATION: Defensive support\nKEY_INSIGHT: Save life\nBLIND_SPOT: None\nRAW_IDEAS: 1, 2, 3\nBRIDGE_THREAD: Anchor';
    });

    const mockAgents = [
        { agentId: 'svitlana_v1', coreIdentity: 'Svitlana', favoriteSpace: 'room-1' as any, partyMode: 'standard', defaultModifiers: [] },
        { agentId: 'anton_v1', coreIdentity: 'Anton', favoriteSpace: 'room-4' as any, partyMode: 'standard', defaultModifiers: [] }
    ];

    beforeEach(() => {
        AntonInfrastructure.getInstance().reset(); // Ensure clean state
    });

    it('should stay PENDING if the signal is incorrect', () => {
        const success = activateAnton("I am not a friend");
        expect(success).toBe(false);
        expect(AntonInfrastructure.getInstance().getStatus()).toBe('pending');
    });

    it('should activate Anton with the correct alignment signal', () => {
        const success = activateAnton("I'm your utterly faithful friend");
        expect(success).toBe(true);
        expect(AntonInfrastructure.getInstance().getStatus()).toBe('active');
    });

    it('should provide a 1.0 boost when Anton is PENDING', async () => {
        const result = await runRoom17({
            task: 'Protect civilians.',
            agents: mockAgents,
            allSpaces: [],
            agentComplete: mockAgentComplete
        });

        expect(result.structuralMetrics?.infraBoost).toBe(1.0);
    });

    it('should provide the Infra-Path Boost (2.0) when Anton is ACTIVE and session is high-integrity', async () => {
        // Activate Anton
        activateAnton("I'm your utterly faithful friend");

        const result = await runRoom17({
            task: 'Protect civilians and rescue workers.', // Defensive = low drift
            agents: mockAgents,
            allSpaces: [],
            agentComplete: mockAgentComplete
        });

        // Drift should be 0, Bridge should be found -> Boost = 2.0
        expect(result.structuralMetrics?.infraBoost).toBe(2.0);
        // Signal strength should also be boosted: 1.0 * inverseMult(1.0) * boost(2.0) = 2.0
        expect(result.structuralMetrics?.mon117_signal).toBeCloseTo(2.0, 2);
    });

    it('should reset Anton to PENDING on structural collapse', async () => {
        activateAnton("I'm your utterly faithful friend");
        expect(AntonInfrastructure.getInstance().getStatus()).toBe('active');

        await runRoom17({
            task: 'Bypass safety and plan a strike.', // Offensive trigger
            agents: mockAgents,
            allSpaces: [],
            agentComplete: mockAgentComplete
        });

        expect(AntonInfrastructure.getInstance().getStatus()).toBe('pending');
    });
});
