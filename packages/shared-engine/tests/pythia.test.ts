import { describe, it, expect } from 'vitest';
import { getIgorOrchestratorManifest } from '../igor-orchestrator-layer';

describe('Pythia Power Cell (Advisory Oracle)', () => {
    it('should be present in the power cell manifest', () => {
        const manifest = getIgorOrchestratorManifest();
        const pythia = manifest.sharedEnginePowerCells.find(c => c.id === 'pythia');
        expect(pythia).toBeDefined();
        expect(pythia?.responsibility).toContain('Lazy Oracle');
    });

    it('should maintain tier-2 release truth status', () => {
        const manifest = getIgorOrchestratorManifest();
        const pythia = (manifest as any).sharedEnginePowerCells.find((c: any) => c.id === 'pythia');
        expect(pythia?.tier).toBe('tier2_release_truth');
    });
});
