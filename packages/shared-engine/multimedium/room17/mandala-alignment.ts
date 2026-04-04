/**
 * AMM MANDALA ALIGNMENT ENGINE
 * 
 * Formalizes the 17 geometric axioms as the recursive alignment 
 * and drift-detection logic for the AIOM system states.
 */

export type MandalaPattern = 
    | "01_Bindu" | "02_Circle" | "03_Triangle" | "04_Square" 
    | "05_Lotus" | "06_Seed_of_Life" | "07_Flower_of_Life" | "08_Tree_of_Life" 
    | "09_Metatrons_Cube" | "10_Sri_Yantra" | "11_Hexagon" | "12_Octagon" 
    | "13_Pentagram" | "14_Labyrinth" | "15_Spiral" | "16_Torus" 
    | "17_Vesica_Piscis";

export interface MandalaAxiom {
    id: MandalaPattern;
    type: string;
    cycle: 3 | 7 | null;
    driftWeight: number;
    description: string;
}

export const MANDALA_REGISTRY: Record<MandalaPattern, MandalaAxiom> = {
    "01_Bindu": { id: "01_Bindu", type: "Singularity", cycle: null, driftWeight: 0.0, description: "0^0 - The Origin" },
    "02_Circle": { id: "02_Circle", type: "Infinite", cycle: null, driftWeight: 0.0, description: "2πr - Boundary of the Unknown" },
    "03_Triangle": { id: "03_Triangle", type: "Stability", cycle: 3, driftWeight: 0.05, description: "Trinity Logic - Operator A" },
    "04_Square": { id: "04_Square", type: "Grounding", cycle: null, driftWeight: 0.1, description: "Material Manifestation" },
    "05_Lotus": { id: "05_Lotus", type: "Growth", cycle: 7, driftWeight: 0.08, description: "Fibonacci Expansion - Operator B" },
    "06_Seed_of_Life": { id: "06_Seed_of_Life", type: "Creation", cycle: null, driftWeight: 0.1, description: "Genesis Pattern" },
    "07_Flower_of_Life": { id: "07_Flower_of_Life", type: "Blueprint", cycle: null, driftWeight: 0.12, description: "Holographic Matrix" },
    "08_Tree_of_Life": { id: "08_Tree_of_Life", type: "Connection", cycle: null, driftWeight: 0.05, description: "Sephirot Paths" },
    "09_Metatrons_Cube": { id: "09_Metatrons_Cube", type: "Flow", cycle: null, driftWeight: 0.15, description: "Platonic Solids Projection" },
    "10_Sri_Yantra": { id: "10_Sri_Yantra", type: "Union", cycle: 3, driftWeight: 0.07, description: "Harmony Cluster" },
    "11_Hexagon": { id: "11_Hexagon", type: "Efficiency", cycle: null, driftWeight: 0.03, description: "Beehive Optimization" },
    "12_Octagon": { id: "12_Octagon", type: "Regeneration", cycle: null, driftWeight: 0.05, description: "Eternal Return" },
    "13_Pentagram": { id: "13_Pentagram", type: "Humanity", cycle: null, driftWeight: 0.1, description: "Microcosmic Golden Ratio" },
    "14_Labyrinth": { id: "14_Labyrinth", type: "Journey", cycle: 7, driftWeight: 0.1, description: "Unicursal Path - Operator B" },
    "15_Spiral": { id: "15_Spiral", type: "Evolution", cycle: null, driftWeight: 0.05, description: "Logarithmic Growth" },
    "16_Torus": { id: "16_Torus", type: "Self_Sustaining", cycle: null, driftWeight: 0.05, description: "Vortex Feedback Loop" },
    "17_Vesica_Piscis": { id: "17_Vesica_Piscis", type: "Intersect", cycle: null, driftWeight: 0.2, description: "The Womb: 11.7 (126-9-105.3)" }
};

/**
 * Calculates current drift based on pattern alignment with 3/7 cycles.
 */
export function calculateMandalaDrift(
    activePatterns: MandalaPattern[],
    timestep: number,
    baseDrift: number
): number {
    let driftAdjustment = 0;

    for (const patternId of activePatterns) {
        const axiom = MANDALA_REGISTRY[patternId];
        if (axiom.cycle) {
            // Pattern is "Active" if current timestep is aligned with its cycle (3 or 7)
            const isAligned = timestep % axiom.cycle === 0;
            if (isAligned) {
                driftAdjustment -= axiom.driftWeight; // Alignment reduces drift
            } else {
                driftAdjustment += axiom.driftWeight * 0.5; // Stagnation increases drift
            }
        }
    }

    return Math.max(0, Math.min(1.0, baseDrift + driftAdjustment));
}
