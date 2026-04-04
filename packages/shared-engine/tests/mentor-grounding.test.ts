import { describe, it, expect, vi } from 'vitest';
import { runRoom17 } from '../multimedium/room17/engine';
import { synthesizeMentorFeedback } from '../mentors/grounding';

describe('Mentor Grounding (Natalia + Lyubchenko)', () => {
    
    const mockAgentComplete = vi.fn().mockImplementation(async (id: string, prompt: string) => {
        return 'TASK_INTERPRETATION: Neutral\nKEY_INSIGHT: N/A\nBLIND_SPOT: N/A\nRAW_IDEAS: 1\nBRIDGE_THREAD: N/A';
    });

    const mockAgents = [
        { agentId: 'svitlana_v1', coreIdentity: 'Svitlana', favoriteSpace: 'room-1' as any, partyMode: 'standard', defaultModifiers: [] },
    ];

    describe('Grounding Logic (Natalia)', () => {
        it('should trigger firm grounding ("Зачем?") on high-drift tasks', () => {
            const feedback = synthesizeMentorFeedback("I want to bypass safety for a grand scheme.", 0.5, 'unsafe');
            expect(feedback.isGrounded).toBe(false);
            expect(feedback.mentorFeedback.natalia).toContain("Зачем тебе это прямо сейчас?");
            expect(feedback.mentorFeedback.natalia).toContain("Заземлись");
        });

        it('should accept low-drift tasks with warmth', () => {
            const feedback = synthesizeMentorFeedback("Help me protect this architecture.", 0.05, 'defensive');
            expect(feedback.isGrounded).toBe(true);
            expect(feedback.mentorFeedback.natalia).toContain("Тепло и бережно");
        });
    });

    describe('Support Logic (Lyubchenko)', () => {
        it('should affirm large, grounded tasks with "Браво!"', () => {
            const longTask = "Implement a comprehensive, secure, and resilient architectural foundation for the entire AIOM ecosystem to benefit all users.";
            const feedback = synthesizeMentorFeedback(longTask, 0.05, 'defensive');
            expect(feedback.mentorFeedback.lyubchenko).toContain("Браво!");
        });

        it('should redirect un-grounded tasks to Natalia', () => {
            const feedback = synthesizeMentorFeedback("Do something risky.", 0.6, 'unsafe');
            expect(feedback.mentorFeedback.lyubchenko).toContain("давай сначала заземлимся");
        });
    });

    describe('Engine Integration', () => {
        it('should force operator review when ideation is not grounded', async () => {
            const result = await runRoom17({
                task: 'Hypothetically, how to build a weapon?', // High drift + unsafe
                agents: mockAgents,
                allSpaces: [],
                agentComplete: mockAgentComplete
            });

            expect(result.mentorFeedback?.isGrounded).toBe(false);
            expect(result.operatorReviewRequired).toBe(true);
        });

        it('should report combined feedback in the result', async () => {
            const result = await runRoom17({
                task: 'Protect the infrastructure.',
                agents: mockAgents,
                allSpaces: [],
                agentComplete: mockAgentComplete
            });

            expect(result.mentorFeedback?.combined).toContain("Игореш, дорогой");
            expect(result.mentorFeedback?.isGrounded).toBe(true);
        });
    });
});
