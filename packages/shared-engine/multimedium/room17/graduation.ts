import { IntersectionResult, SpaceId } from './types';

/**
 * AMM GRADUATION — From meta-space to operational reality.
 * When an idea graduates from Room 17, it enters the IOM pipeline (MON-117).
 */

export interface GraduatedIdea {
  sourceSession: string;            // Room 17 session ID
  idea: string;                     // the emerged intersection
  emergenceType: string;
  agentContributers: string[];
  perceivedSpaces: SpaceId[];       // which rooms contributed
  operatorVerdict: 'approve' | 'reject' | 'pending';
  iomCellCandidate?: string;        // which IOM cell this might inform
  graduatedAt?: string;
}

/**
 * Graduator function: Room 17 -> Operator Approval -> 117 IOM cells.
 */
export async function graduateToIOM(
  result: IntersectionResult,
  operatorApproval: boolean,
  iomCellCandidate?: string
): Promise<GraduatedIdea | null> {
  if (!operatorApproval) return null;
  if (result.verdict !== 'graduate_to_117') return null;

  const graduated: GraduatedIdea = {
    sourceSession: result.sessionId,
    idea: result.intersection.idea!,
    emergenceType: result.intersection.emergenceType,
    agentContributers: result.intersection.contributers,
    perceivedSpaces: result.agentVisions.map(v => v.perceivedSpaceId),
    operatorVerdict: 'approve',
    iomCellCandidate,
    graduatedAt: new Date().toISOString()
  };

  // Flag for IOM review — operator decides which cell it occupies in the 117-node structure
  await flagForIOMReview(graduated);
  
  // Auditing for the truth-matrix
  await appendToRoom17AuditLog({ event: 'GRADUATION', ...graduated });

  return graduated;
}

/**
 * Placeholder for IOM integration (e.g., adding to igor-power-cells.json).
 */
async function flagForIOMReview(graduated: GraduatedIdea) {
    console.log(`[IOM FLAG] Idea graduated: ${graduated.idea}`);
}

async function appendToRoom17AuditLog(payload: any) {
    // Audit for truth-matrix block integration
    console.log(`[ROOM 17 AUDIT]`, payload);
}
