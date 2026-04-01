import { NextResponse } from 'next/server';
import { readTokenLedger, recordTokenUsage } from "@alchemist/shared-engine/node";
import type { Panelist, TokenUsageMetrics } from "@alchemist/shared-types";

export type UsageApiResponse = {
  /** Full line for the token pill (matches product UI spec) */
  tokensLine: string;
  dUsed: number;
  dCap: number;
  mUsed: number;
  mCap: number;
  // MOVE 5: Token Savings
  totalSaved?: number;
  savingsPercent?: number;
  baselineMode?: string;
  totalRequests?: number;
  totalActualTokens?: number;
  totalBaselineTokens?: number;
  lastUpdatedUtc?: string;
};

/** Stub until billing is wired; shape matches home token pill. */
export function GET() {
  const ledger = readTokenLedger();
  
  const dCap = 100_000;
  const mCap = 2_000_000;

  // For the display line, we'll format based on what we have
  const saved = Math.round(ledger.window.totalSavedTokens);
  const percent = ledger.window.savingsPercent.toFixed(1);
  const totalUsed = Math.round(ledger.window.totalActualTokens);
  
  const tokensLine = `Tokens D ${totalUsed.toLocaleString()}/${dCap.toLocaleString()} · Saved ${saved.toLocaleString()} (${percent}%)`;

  const body: UsageApiResponse = {
    tokensLine,
    dUsed: totalUsed,
    dCap,
    mUsed: 0,
    mCap,
    totalSaved: saved,
    savingsPercent: ledger.window.savingsPercent,
    baselineMode: "estimated",
    totalRequests: ledger.window.totalRequests,
    totalActualTokens: Math.round(ledger.window.totalActualTokens),
    totalBaselineTokens: Math.round(ledger.window.totalBaselineTokens),
    lastUpdatedUtc: ledger.lastUpdatedUtc,
  };
  return NextResponse.json(body);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      actual: Record<Panelist, TokenUsageMetrics | null>;
      baseline: Record<Panelist, number>;
    };

    if (!body.actual || !body.baseline) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    const nextLedger = recordTokenUsage(body);
    return NextResponse.json({ ok: true, version: nextLedger.version });
  } catch (err) {
    console.error("Usage record failed:", err);
    return NextResponse.json({ error: "record_failed" }, { status: 500 });
  }
}
