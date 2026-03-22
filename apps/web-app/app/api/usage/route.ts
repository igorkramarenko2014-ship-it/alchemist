import { NextResponse } from 'next/server';

export type UsageApiResponse = {
  /** Full line for the token pill (matches product UI spec) */
  tokensLine: string;
  dUsed: number;
  dCap: number;
  mUsed: number;
  mCap: number;
};

/** Stub until billing is wired; shape matches home token pill. */
export function GET() {
  const body: UsageApiResponse = {
    tokensLine: 'Tokens D 0/100 000 · M 0/2 000 000',
    dUsed: 0,
    dCap: 100_000,
    mUsed: 0,
    mCap: 2_000_000,
  };
  return NextResponse.json(body);
}
