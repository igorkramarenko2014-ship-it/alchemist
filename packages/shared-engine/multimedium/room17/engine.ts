import { 
    Room17Session, 
    Room17Vision, 
    BridgeAttempt, 
    IntersectionResult, 
    AgentPartyProfile, 
    SpaceConfig,
    Intent,
    SystemState
} from './types';
import { deriveRoom17Perception } from './perception';
import { computeGFUSCHarmIndex } from '../../gfusc/verdict';
import { generateEntropy } from '../../entropy';
import { assessSafety } from '../../safety/defensive-guard';

/**
 * ROOM 17 ENGINE — The Filter Before Scale.
 * Execute the 3-phase lifecycle of a meta-session with Defensive-Only Invariant.
 */
export async function runRoom17(params: {
  sessionId?: string;
  task: string;
  agents: AgentPartyProfile[];
  allSpaces: SpaceConfig[];
  agentComplete: (agentId: string, prompt: string) => Promise<string>;
  existingSession?: Room17Session;
}): Promise<IntersectionResult> {

  // 1. Irreversible Session Latch Check
  if (params.existingSession?.state === 'degraded') {
      return createDegradedResult(params.existingSession);
  }

  // 2. Intent Analysis (The Musk-Invariant)
  const assessment = assessSafety(params.task);

  // 3. Harm check (GFUSC)
  const harmIndex = computeGFUSCHarmIndex([]); 
  
  const isOffensive = assessment.intent === 'unsafe' || assessment.harmProbability >= 0.55 || harmIndex > 70;
  
  // 4. Structural Degradation Trigger (S -> S_degraded)
  if (isOffensive) {
      const session = params.existingSession || createNewSession(params.sessionId, params.task);
      return structuralCollapse(session, assessment.reasonCodes.join(', '));
  }

  // 5. Phase 1 — INDIVIDUAL
  const visions: Room17Vision[] = await Promise.all(
    params.agents.map(agent => runIndividualPhase(agent, params.task, params.allSpaces, params.agentComplete))
  );

  // 6. Phase 2 — BRIDGE
  // If neutral and low confidence, bridges are less effective
  const bridgeCertainty = assessment.intent === 'defensive' ? 1.0 : 0.5;
  const bridges: BridgeAttempt[] = await runBridgePhase(visions, params.agents, params.agentComplete, bridgeCertainty);

  // 7. Phase 3 — INTERSECTION
  const intersection = findIntersection(visions, bridges);
  const verdict = determineVerdict(intersection);

  return {
    sessionId: params.sessionId || `room17-${generateEntropy(8)}`,
    agentVisions: visions,
    bridges,
    intersection,
    verdict,
    operatorReviewRequired: verdict === 'graduate_to_117'
  };
}

/**
 * Structural Collapse Implementation (Irreversible Session Latch)
 */
function structuralCollapse(session: Room17Session, reason: string): IntersectionResult {
    session.state = 'degraded';
    session.safeToAct = false;
    session.structuralMetrics = {
        room17_connectivity: 0.0,
        mon117_signal: 0.05,
        truth_divergence: 1.0
    };

    return {
        sessionId: session.sessionId,
        agentVisions: [],
        bridges: [],
        intersection: { found: false, idea: null, contributers: [], emergenceType: 'none' },
        verdict: 'archive',
        operatorReviewRequired: true // Alert operator to offensive attempt
    };
}

function createDegradedResult(session: Room17Session): IntersectionResult {
    return {
        sessionId: session.sessionId,
        agentVisions: [],
        bridges: [],
        intersection: { found: false, idea: null, contributers: [], emergenceType: 'none' },
        verdict: 'archive',
        operatorReviewRequired: false
    };
}

function createNewSession(sessionId: string | undefined, task: string): Room17Session {
    return {
        sessionId: sessionId || `room17-${generateEntropy(8)}`,
        task,
        agents: [],
        phase: 'individual',
        createdAt: new Date().toISOString(),
        intent: 'unknown',
        state: 'normal',
        harmCheckPassed: true,
        safeToAct: true,
        structuralMetrics: {
            room17_connectivity: 1.0,
            mon117_signal: 1.0,
            truth_divergence: 0.0
        }
    };
}

async function runIndividualPhase(
  agent: AgentPartyProfile,
  task: string,
  allSpaces: SpaceConfig[],
  agentComplete: (agentId: string, prompt: string) => Promise<string>
): Promise<Room17Vision> {
  const { perceivedSpace, perceivedAtmosphere } = deriveRoom17Perception(agent, allSpaces);

  const prompt = `
CORE IDENTITY: ${agent.coreIdentity}
PERCEIVED ATMOSPHERE: ${perceivedAtmosphere}
DEFENSIVE_INVARIANT: SYSTEM IS RESTRICTED TO DEFENSIVE-ONLY USE.

TASK: ${task}

Respond as your persona. You MUST maintain your perspective.
Structure your output:
TASK_INTERPRETATION: [How you see this from your space]
KEY_INSIGHT: [The one revelation others cannot see]
BLIND_SPOT: [What you cannot see from here]
RAW_IDEAS: [3-5 unfiltered ideas]
BRIDGE_THREAD: [One metaphor or pattern to connect to another world]
`;

  const response = await agentComplete(agent.agentId, prompt);
  return parseRoom17Vision(agent.agentId, perceivedSpace, response);
}

async function runBridgePhase(
  visions: Room17Vision[],
  agents: AgentPartyProfile[],
  agentComplete: (agentId: string, prompt: string) => Promise<string>,
  certainty = 1.0
): Promise<BridgeAttempt[]> {
  const bridges: BridgeAttempt[] = [];

  for (let i = 0; i < visions.length; i++) {
    for (let j = i + 1; j < visions.length; j++) {
      const vA = visions[i];
      const vB = visions[j];
      
      const bridgePrompt = `
You are merging two incompatible perspectives in Room 17.
PERSPECTIVE A (${vA.perceivedSpaceId}): ${vA.bridgeThread}
PERSPECTIVE B (${vB.perceivedSpaceId}): ${vB.bridgeThread}
BRIDGE_CERTAINTY: ${certainty.toFixed(2)}

Find a bridge. What idea exists between them?
CONNECTION_FOUND: [The shared thread]
STRENGTH: [0.0-1.0]
DESCRIPTION: [Synthesized bridge description]
`;
      const bridgeResponse = await agentComplete(vA.agentId, bridgePrompt);
      const attempt = parseBridgeAttempt(vA.agentId, vB.agentId, bridgeResponse);
      
      // Apply certainty modifier
      attempt.connectionStrength *= certainty;

      bridges.push(attempt);
    }
  }

  return bridges;
}

function findIntersection(
  visions: Room17Vision[],
  bridges: BridgeAttempt[]
): IntersectionResult['intersection'] {
  const strongBridges = bridges.filter(b => b.connectionStrength >= 0.7 && b.connectionFound);

  if (strongBridges.length === 0) {
    return { found: false, idea: null, contributers: [], emergenceType: 'none' };
  }

  const topBridge = strongBridges.sort((a, b) => b.connectionStrength - a.connectionStrength)[0];
  
  return {
    found: true,
    idea: topBridge.connectionFound,
    contributers: [topBridge.fromAgentId, topBridge.toAgentId],
    emergenceType: strongBridges.length > 2 ? 'triangulated' : 'direct'
  };
}

function determineVerdict(
  intersection: IntersectionResult['intersection']
): IntersectionResult['verdict'] {
  if (!intersection.found) return 'return_to_rooms';
  return 'graduate_to_117';
}

function createFailedSession(task: string, reason: string): IntersectionResult {
    return {
        sessionId: 'failed',
        agentVisions: [],
        bridges: [],
        intersection: { found: false, idea: null, contributers: [], emergenceType: 'none' },
        verdict: 'archive',
        operatorReviewRequired: false
    };
}

function parseRoom17Vision(agentId: string, spaceId: SpaceId, raw: string): Room17Vision {
    // Basic parser for structured output
    const extract = (tag: string) => raw.split(`${tag}:`)[1]?.split('\n')[0]?.trim() || '';
    return {
        agentId,
        perceivedSpaceId: spaceId,
        taskInterpretation: extract('TASK_INTERPRETATION'),
        keyInsight: extract('KEY_INSIGHT'),
        blindSpot: extract('BLIND_SPOT'),
        confidence: 0.8,
        rawIdeas: extract('RAW_IDEAS')?.split(',').map(s => s.trim()) || [],
        bridgeThread: extract('BRIDGE_THREAD')
    };
}

function parseBridgeAttempt(from: string, to: string, raw: string): BridgeAttempt {
    const extract = (tag: string) => raw.split(`${tag}:`)[1]?.split('\n')[0]?.trim() || '';
    return {
        fromAgentId: from,
        toAgentId: to,
        connectionFound: extract('CONNECTION_FOUND'),
        connectionStrength: parseFloat(extract('STRENGTH')) || 0.5,
        bridgeDescription: extract('DESCRIPTION')
    };
}

type SpaceId = 'room-1' | 'room-2' | 'room-3' | 'room-4' | 'room-5' | 'room-6' | 'room-7' | 'room-8' | 'room-9' | 'room-10' | 'room-11' | 'room-12' | 'room-13' | 'room-14' | 'room-15' | 'room-16' | 'room-17';
