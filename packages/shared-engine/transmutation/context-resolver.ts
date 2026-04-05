import fs from "node:fs";
import { resolveContext as resolveContextLogic } from "./context-resolver-logic";
import type { TaskSchema, ContextPack } from "./transmutation-types";

/**
 * Builds ContextPack from available engine state (Node only).
 * Resolves paths first, then calls pure logic.
 */
export function resolveContext(
  task: TaskSchema,
  opts?: {
    learningIndexPath?: string;
    tasteIndexPath?: string;
    recentExports?: string[];
    wikiKnowledge?: ContextPack["wiki_knowledge"];
    domainVocabulary?: string[];
    coreConcepts?: string[];
  }
): ContextPack {
  const learningIndex = loadJsonSafe(opts?.learningIndexPath);
  const tasteIndex = loadJsonSafe(opts?.tasteIndexPath);

  return resolveContextLogic(task, {
    learningIndex,
    tasteIndex,
    recentExports: opts?.recentExports,
    wikiKnowledge: opts?.wikiKnowledge,
    domainVocabulary: opts?.domainVocabulary,
    coreConcepts: opts?.coreConcepts,
  });
}

function loadJsonSafe(path?: string): any | null {
  if (!path || !fs.existsSync(path)) return null;
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}
