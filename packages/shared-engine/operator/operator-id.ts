/**
 * OPERATOR IDENTITY CONTRACT (Phase 4.0)
 *
 * Strict rules for operator IDs to ensure safe file sharding and identity integrity.
 */

export type OperatorId = string;

export const IHOR_ID: OperatorId = "ihor";
export const CLARA_ID: OperatorId = "clara";

const OPERATOR_ID_REGEX = /^[a-z0-9_-]{2,40}$/;

export function isValidOperatorId(id: string): id is OperatorId {
  return OPERATOR_ID_REGEX.test(id);
}

export function validateOperatorId(id: string): asserts id is OperatorId {
  if (!isValidOperatorId(id)) {
    throw new Error(
      `Invalid operatorId: "${id}". Expected /^[a-z0-9_-]{2,40}$/`,
    );
  }
}

export function normalizeOperatorId(id: string): OperatorId {
  const normalized = id.trim().toLowerCase();
  validateOperatorId(normalized);
  return normalized;
}

export function isCanonicalIhor(id: string): boolean {
  return id === IHOR_ID;
}

export function isSandboxClara(id: string): boolean {
  return id === CLARA_ID;
}
