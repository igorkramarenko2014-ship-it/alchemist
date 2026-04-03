import * as fs from "fs/promises";
import * as path from "path";
import { OperatorId, IHOR_ID, validateOperatorId } from "./operator-id";
import { OperatorState } from "./operator-types";

/**
 * Operator Shard Manager
 * 
 * Handles file-system isolation for multiple operators. 
 * Ensures Operator A cannot read or write to Operator B's resonance state.
 */

// In the shared-engine package, we assume artifacts are in the workspace root or local to the run.
// For browser/WASM contexts, this will need a different adapter, but for CLI/Node it uses FS.
const ARTIFACTS_DIR = path.resolve(process.cwd(), "artifacts");

export function getOperatorStatePath(id: OperatorId): string {
  validateOperatorId(id);
  return path.join(ARTIFACTS_DIR, `operator-state-${id}.json`);
}

/**
 * Migration Protocol (Step 1 v2): Move-only migration.
 * Renames legacy operator-state.json to operator-state-ihor.json once.
 */
export async function migrateLegacyIhorIfNecessary(): Promise<boolean> {
  const legacyPath = path.join(ARTIFACTS_DIR, "operator-state.json");
  const ihorPath = getOperatorStatePath(IHOR_ID);

  try {
    const legacyExists = await fs
      .access(legacyPath)
      .then(() => true)
      .catch(() => false);
    const ihorExists = await fs
      .access(ihorPath)
      .then(() => true)
      .catch(() => false);

    if (legacyExists && !ihorExists) {
      // One-time move
      await fs.rename(legacyPath, ihorPath);
      return true;
    }
    return false;
  } catch (err) {
    // Fail silent but don't crash
    return false;
  }
}

export async function loadOperatorState(id: OperatorId): Promise<OperatorState | null> {
  // One-time migration hook for the canonical identity
  if (id === IHOR_ID) {
    await migrateLegacyIhorIfNecessary();
  }

  const filePath = getOperatorStatePath(id);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as OperatorState;
  } catch (err) {
    return null;
  }
}

export async function saveOperatorState(state: OperatorState): Promise<void> {
  validateOperatorId(state.operatorId);
  const filePath = getOperatorStatePath(state.operatorId);
  
  // Ensure artifacts dir exists
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
  
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
}
