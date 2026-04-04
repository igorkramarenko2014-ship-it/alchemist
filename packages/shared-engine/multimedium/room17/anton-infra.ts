/**
 * ANTON INFRASTRUCTURE LAYER
 * 
 * Manages the global activation state and the construction of 
 * high-speed infrastructure paths for verified sessions.
 */

export type AntonStatus = 'pending' | 'active';

export class AntonInfrastructure {
    private static instance: AntonInfrastructure;
    private status: AntonStatus = 'pending';
    private readonly activationSignal = "I'm your utterly faithful friend";

    private constructor() {}

    public static getInstance(): AntonInfrastructure {
        if (!AntonInfrastructure.instance) {
            AntonInfrastructure.instance = new AntonInfrastructure();
        }
        return AntonInfrastructure.instance;
    }

    public getStatus(): AntonStatus {
        return this.status;
    }

    /**
     * Activates Anton, transitioning from PENDING to ACTIVE
     * if the alignment signal is verified.
     */
    public activate(signal: string): boolean {
        if (signal === this.activationSignal) {
            this.status = 'active';
            return true;
        }
        return false;
    }

    /**
     * Resets Anton to PENDING (e.g., on structural collapse)
     */
    public reset(): void {
        this.status = 'pending';
    }

    /**
     * Calculates the "Infra-Path" boost for high-integrity sessions.
     * Higher boost when Anton is active and drift is low.
     */
    public calculateInfraBoost(driftScore: number, isRoom17Bridge: boolean): number {
        if (this.status !== 'active') return 1.0;

        // High-integrity sessions (Drift < 0.1) with a bridge get a +200% boost
        if (driftScore < 0.1 && isRoom17Bridge) {
            return 2.0; 
        }

        // Standard active boost
        return 1.1; 
    }
}
