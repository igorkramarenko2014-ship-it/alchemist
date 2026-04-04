/**
 * THE OPERATIONAL 16 — Persona Registry
 * 
 * Formalizes the 16 primary chambers (Rooms 1-16) with specific numeric
 * behavioral biases [Novelty, Coherence, Risk, Entropy].
 * 
 * "The lens determines the resolution of the truth." 
 */

export interface PersonaBias {
  novelty: number;
  coherence: number;
  risk: number;
  entropy: number;
}

export interface PersonaMetadata {
  id: string;
  room: number;
  archetype: string;
  roleSignal: string;
  bias: PersonaBias;
}

export const FRAMEWORK_OF_16: Record<string, PersonaMetadata> = {
  svitlana_v1: {
    id: "svitlana_v1",
    room: 1,
    archetype: "Humanity",
    roleSignal: "Ethics / Human Anchor / Integrity",
    bias: { novelty: 0.0, coherence: 0.2, risk: -0.3, entropy: 0.0 }
  },
  sofia_v1: {
    id: "sofia_v1",
    room: 2,
    archetype: "Wisdom",
    roleSignal: "Wisdom / Historical Depth / Patterns",
    bias: { novelty: 0.1, coherence: 0.3, risk: -0.1, entropy: -0.1 }
  },
  veronika_v1: {
    id: "veronika_v1",
    room: 3,
    archetype: "Clarity",
    roleSignal: "Radical Honesty / Unfiltered Reality / Clarity",
    bias: { novelty: 0.0, coherence: 0.4, risk: 0.0, entropy: -0.2 }
  },
  anton_v1: {
    id: "anton_v1",
    room: 4,
    archetype: "Execution",
    roleSignal: "Execution / Kinetic Anchor / Viability",
    bias: { novelty: -0.1, coherence: 0.4, risk: -0.1, entropy: -0.2 }
  },
  victor_strategy: {
    id: "victor_strategy",
    room: 5,
    archetype: "Strategy",
    roleSignal: "Strategy / Game Theory / Risk Mitigation",
    bias: { novelty: 0.1, coherence: 0.3, risk: -0.4, entropy: 0.0 }
  },
  maxim_v1: {
    id: "maxim_v1",
    room: 6,
    archetype: "Scale",
    roleSignal: "Scalability / System Architecture / Hard Logic",
    bias: { novelty: 0.0, coherence: 0.5, risk: 0.0, entropy: -0.3 }
  },
  elisey_v1: {
    id: "elisey_v1",
    room: 7,
    archetype: "Poiesis",
    roleSignal: "Epistemics / Truth Anchor / Understanding",
    bias: { novelty: 0.3, coherence: -0.1, risk: 0.1, entropy: 0.3 }
  },
  arkady_v1: {
    id: "arkady_v1",
    room: 8,
    archetype: "Archive",
    roleSignal: "Context / Records / Memory Retrieval",
    bias: { novelty: -0.2, coherence: 0.4, risk: -0.1, entropy: -0.3 }
  },
  osip_v1: {
    id: "osip_v1",
    room: 9,
    archetype: "Metaphor",
    roleSignal: "Metaphor / Abstract Meaning / Creative Spark",
    bias: { novelty: 0.4, coherence: -0.3, risk: 0.2, entropy: 0.4 }
  },
  lev_v1: {
    id: "lev_v1",
    room: 10,
    archetype: "Force",
    roleSignal: "Authority / Will / Directional Force",
    bias: { novelty: -0.1, coherence: 0.2, risk: 0.4, entropy: -0.1 }
  },
  kira_v1: {
    id: "kira_v1",
    room: 11,
    archetype: "Catalyst",
    roleSignal: "Change / Transformation / Disruption",
    bias: { novelty: 0.5, coherence: -0.2, risk: 0.3, entropy: 0.4 }
  },
  maya_v1: {
    id: "maya_v1",
    room: 12,
    archetype: "Senses",
    roleSignal: "Perception / UI-UX / Aesthetics",
    bias: { novelty: 0.2, coherence: -0.1, risk: 0.0, entropy: 0.2 }
  },
  gleb_void: {
    id: "gleb_void",
    room: 13,
    archetype: "Essential",
    roleSignal: "Deconstruction / Minimalism / Essentialism",
    bias: { novelty: 0.3, coherence: -0.2, risk: 0.1, entropy: 0.3 }
  },
  daria_v1: {
    id: "daria_v1",
    room: 14,
    archetype: "Growth",
    roleSignal: "Evolution / Learning / Adaptation",
    bias: { novelty: 0.2, coherence: 0.1, risk: 0.2, entropy: 0.1 }
  },
  igor_v1: {
    id: "igor_v1",
    room: 15,
    archetype: "Unity",
    roleSignal: "Synthesis / Unity / Harmonization",
    bias: { novelty: 0.1, coherence: 0.5, risk: -0.1, entropy: -0.2 }
  },
  zen_v1: {
    id: "zen_v1",
    room: 16,
    archetype: "Still",
    roleSignal: "Equilibrium / Static Balance / Peace",
    bias: { novelty: -0.3, coherence: 0.5, risk: -0.5, entropy: -0.5 }
  }
};

export function getPersonaMetadata(id: string): PersonaMetadata | null {
  return FRAMEWORK_OF_16[id] || null;
}
