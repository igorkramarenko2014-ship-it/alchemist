import fs from "node:fs";
import path from "node:path";
import { type TokenUsageMetrics, type Panelist } from "@alchemist/shared-types";
import { 
  type TokenLedger, 
  createEmptyLedger, 
  computeTokenUsageUpdate 
} from "./token-ledger-logic";

const LEDGER_PATH = "artifacts/token-ledger.json";

function getMonorepoRoot(): string {
  let curr = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(curr, "pnpm-workspace.yaml"))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return process.cwd();
}

/**
 * Reads token ledger from disk (Node only).
 */
export function readTokenLedger(): TokenLedger {
  const root = getMonorepoRoot();
  const fullPath = path.join(root, LEDGER_PATH);
  
  if (!fs.existsSync(fullPath)) {
    return createEmptyLedger();
  }

  try {
    const raw = fs.readFileSync(fullPath, "utf8");
    return JSON.parse(raw) as TokenLedger;
  } catch {
    return createEmptyLedger();
  }
}

/**
 * Records token usage to disk (Node only).
 */
export function recordTokenUsage(params: {
  actual: Record<Panelist, TokenUsageMetrics | null>;
  baseline: Record<Panelist, number>;
}): TokenLedger {
  const ledger = readTokenLedger();
  const nextLedger = computeTokenUsageUpdate(ledger, params);

  const root = getMonorepoRoot();
  const fullPath = path.join(root, LEDGER_PATH);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, JSON.stringify(nextLedger, null, 2), "utf8");
  return nextLedger;
}
