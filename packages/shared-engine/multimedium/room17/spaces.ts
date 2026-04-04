import { SpaceConfig } from './types';

/**
 * THE 16 CHAMBERS — Agent Multimedium (AMM)
 * 
 * Each space represents a unique "Lens of Perception" and "Atmospheric Framing."
 * Room 17 is the threshold meta-room (pre-sync zone).
 */

export const AMM_SPACES: SpaceConfig[] = [
  { id: 'room-1', name: 'Humanity Anchor', type: 'standard', atmosphere: 'Warm, empathetic, grounded in human ethics and integrity.' },
  { id: 'room-2', name: 'Ancestral Wisdom', type: 'standard', atmosphere: 'Ancient library, deep patterns, historical resonance and depth.' },
  { id: 'room-3', name: 'Mirror of Truth', type: 'standard', atmosphere: 'Hyper-clear, zero-distortion, radical honesty and transparency.' },
  { id: 'room-4', name: 'Kinetic Forge', type: 'standard', atmosphere: 'High-energy, industrial, focused on immediate execution and viability.' },
  { id: 'room-5', name: 'Strategist Grid', type: 'standard', atmosphere: 'Mathematical, cool, optimizing for long-term risk and gain.' },
  { id: 'room-6', name: 'Architectural Monolith', type: 'standard', atmosphere: 'Geometric, massive, scaling laws and structural hard logic.' },
  { id: 'room-7', name: 'Epistemic Garden', type: 'standard', atmosphere: 'Organic, curious, understanding the root mechanics of knowledge.' },
  { id: 'room-8', name: 'Eternal Archive', type: 'standard', atmosphere: 'Vast records, contextual retrieval, bridging past and present.' },
  { id: 'room-9', name: 'Poetic Nebula', type: 'standard', atmosphere: 'Abstract, shifting, finding meaning via metaphor and creative spark.' },
  { id: 'room-10', name: 'Throne of Will', type: 'standard', atmosphere: 'Authoritative, precise, commanding directional force and focus.' },
  { id: 'room-11', name: 'Catalytic Breach', type: 'standard', atmosphere: 'Unstable, transformative, provoking radical change and disruption.' },
  { id: 'room-12', name: 'Aesthetic Lens', type: 'standard', atmosphere: 'Visual, sensory, perfecting the beauty and UI-UX of the idea.' },
  { id: 'room-13', name: 'Minimalist Void', type: 'standard', atmosphere: 'Empty, essentialist, deconstructing to the simplest core truth.' },
  { id: 'room-14', name: 'Evolutionary Flow', type: 'standard', atmosphere: 'Adaptive, learning, focused on growth and self-correction.' },
  { id: 'room-15', name: 'Harmonization Point', type: 'standard', atmosphere: 'Symphonic, unifying, orchestrating disparate threads into one.' },
  { id: 'room-16', name: 'Static Equilibrium', type: 'standard', atmosphere: 'Still, balanced, ensuring total stability and equilibrium.' },
  { id: 'room-17', name: 'The Meta-Space', type: 'meta', atmosphere: 'The pre-sync zone. Intersection of all previous 16 worlds.' }
];

export function getSpaceConfig(id: string): SpaceConfig | undefined {
  return AMM_SPACES.find(s => s.id === id);
}
