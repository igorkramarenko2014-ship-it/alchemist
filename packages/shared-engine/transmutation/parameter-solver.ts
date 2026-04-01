import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { solveParameters as solveParametersLogic } from "./parameter-solver-logic";
import {
  PolicyFamily,
  type TransmutationProfile,
  type TaskSchema,
  type ContextPack,
  type AuditTrace,
} from "./transmutation-types";

const __here = dirname(fileURLToPath(import.meta.url));
const REFINERY_PATH = join(__here, "refinery/refinery-overrides.json");

/**
 * Compute TransmutationProfile from policy, context, and hard bounds (Node only).
 * Loads Refinery overrides from disk then calls pure logic.
 */
export function solveParameters(
  policy: PolicyFamily,
  task: TaskSchema,
  context: ContextPack
): { profile: TransmutationProfile; audit: AuditTrace } {
  let refineryOverrides: any = null;
  if (existsSync(REFINERY_PATH)) {
    try {
      refineryOverrides = JSON.parse(readFileSync(REFINERY_PATH, "utf8"));
    } catch {
      // Fail-open
    }
  }

  return solveParametersLogic(policy, task, context, { refineryOverrides });
}
