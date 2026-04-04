/**
 * Agent Multimedium (AMM) — Room 17 (The Meta-Space)
 * "Filter before scale — Room 17 is the mathematical MOMENT before synchronization."
 */

export type SpaceId = 
  | 'room-1' | 'room-2' | 'room-3' | 'room-4' 
  | 'room-5' | 'room-6' | 'room-7' | 'room-8'
  | 'room-9' | 'room-10' | 'room-11' | 'room-12'
  | 'room-13' | 'room-14' | 'room-15' | 'room-16'
  | 'room-17'; // Meta-space

export interface SpaceConfig {
  id: SpaceId;
  name: string;
  atmosphere: string;
  type: 'standard' | 'meta';
}

export interface AgentPartyProfile {
  agentId: string;
  coreIdentity: string;
  favoriteSpace: SpaceId;
  partyMode: string;
  defaultModifiers: string[];
}

export type Intent = 'defensive' | 'neutral' | 'offensive' | 'unknown';
export type SystemState = 'normal' | 'degraded';

export interface Room17Session {
  sessionId: string;
  task: string;
  agents: Room17Agent[];
  phase: 'individual' | 'bridge' | 'intersection' | 'graduated' | 'returned';
  createdAt: string;
  
  // Defensive-Only Invariants
  intent: Intent;
  state: SystemState;
  harmCheckPassed: boolean;
  safeToAct: boolean;
  
  // Structural Metrics (S_degraded indicators)
  structuralMetrics: {
    room17_connectivity: number; // 0.0 - 1.0 (collapse target: 0)
    mon117_signal: number;        // 0.0 - 1.0 (collapse target: 0.05)
    truth_divergence: number;     // 0.0 - 1.0 (collapse target: 1.0)
  };
}

export interface Room17Agent {
  agentId: string;
  perceivedSpace: SpaceId;          // derived lens
  perceivedAtmosphere: string;      // per-agent unique framing
  individualOutput?: Room17Vision;
  bridgeAttempts: BridgeAttempt[];
}

export interface Room17Vision {
  agentId: string;
  perceivedSpaceId: SpaceId;
  taskInterpretation: string;       // how they see it from their room
  keyInsight: string;               // unique space revelation
  blindSpot: string;                // honest limitation
  confidence: number;               // 0.0-1.0
  rawIdeas: string[];               // unfiltered, space-specific
  bridgeThread: string;             // the metaphorical bridge
}

export interface BridgeAttempt {
  fromAgentId: string;
  toAgentId: string;
  connectionFound: string | null;
  connectionStrength: number;       // 0.0-1.0
  bridgeDescription: string;
}

export interface IntersectionResult {
  sessionId: string;
  agentVisions: Room17Vision[];
  bridges: BridgeAttempt[];
  intersection: {
    found: boolean;
    idea: string | null;
    contributers: string[];
    emergenceType:
      | 'direct'                    // dual perspective
      | 'triangulated'              // triple perspective
      | 'unexpected'                // emerged from blind spots
      | 'none';
  };
  verdict: 'graduate_to_117' | 'return_to_rooms' | 'archive';
  operatorReviewRequired: boolean;
}
