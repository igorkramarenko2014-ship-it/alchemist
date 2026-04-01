'use client';

import type { AgentAjiChatFusion, InfluenceStatus } from '@alchemist/shared-engine';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface TriadHealthState {
  loading: boolean;
  error: boolean;
  triadFullyLive: boolean;
  livePanelists: string[];
  panelistRoutes: string;
  /** From GET /api/health `agentAjiChatFusion` — operator hints only. */
  agentAjiChatFusion: AgentAjiChatFusion | null;
  /** From GET /api/health `influence` — Move 1 Influence Surface. */
  influence: InfluenceStatus | null;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function parseAgentAjiChatFusion(data: unknown): AgentAjiChatFusion | null {
  if (!isRecord(data)) return null;
  const f = data.agentAjiChatFusion;
  if (!isRecord(f)) return null;
  const lines = f.fusionLines;
  const codes = f.fusionCodes;
  if (!Array.isArray(lines) || !lines.every((x): x is string => typeof x === 'string')) {
    return null;
  }
  const fusionCodes =
    Array.isArray(codes) && codes.every((x): x is string => typeof x === 'string')
      ? codes
      : [];
  return { fusionCodes, fusionLines: lines };
}

function parseTriadFromHealth(data: unknown): Pick<
  TriadHealthState,
  'triadFullyLive' | 'livePanelists' | 'panelistRoutes' | 'agentAjiChatFusion' | 'influence'
> | null {
  if (!isRecord(data)) return null;
  const triad = data.triad;
  if (!isRecord(triad)) return null;
  const triadFullyLive = triad.triadFullyLive === true;
  const livePanelists = Array.isArray(triad.livePanelists)
    ? triad.livePanelists.filter((x): x is string => typeof x === 'string')
    : [];
  const panelistRoutes = typeof triad.panelistRoutes === 'string' ? triad.panelistRoutes : '';
  const agentAjiChatFusion = parseAgentAjiChatFusion(data);
  const influence = isRecord(data.influence) ? (data.influence as unknown as InfluenceStatus) : null;
  return { triadFullyLive, livePanelists, panelistRoutes, agentAjiChatFusion, influence };
}

const POLL_MS = 30_000;

export function useTriadHealth(): TriadHealthState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [triadFullyLive, setTriadFullyLive] = useState(false);
  const [livePanelists, setLivePanelists] = useState<string[]>([]);
  const [panelistRoutes, setPanelistRoutes] = useState('');
  const [agentAjiChatFusion, setAgentAjiChatFusion] = useState<AgentAjiChatFusion | null>(null);
  const [influence, setInfluence] = useState<InfluenceStatus | null>(null);
  const mounted = useRef(true);

  const fetchHealth = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store', signal });
      if (!res.ok) {
        if (!mounted.current) return;
        setError(true);
        setAgentAjiChatFusion(null);
        setInfluence(null);
        setLoading(false);
        return;
      }
      const json: unknown = await res.json();
      const parsed = parseTriadFromHealth(json);
      if (!mounted.current) return;
      if (!parsed) {
        setError(true);
        setAgentAjiChatFusion(null);
        setInfluence(null);
        setLoading(false);
        return;
      }
      setTriadFullyLive(parsed.triadFullyLive);
      setLivePanelists(parsed.livePanelists);
      setPanelistRoutes(parsed.panelistRoutes);
      setAgentAjiChatFusion(parsed.agentAjiChatFusion);
      setInfluence(parsed.influence);
      setError(false);
      setLoading(false);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (!mounted.current) return;
      setError(true);
      setAgentAjiChatFusion(null);
      setInfluence(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const ac = new AbortController();
    void fetchHealth(ac.signal);
    const id = window.setInterval(() => {
      void fetchHealth();
    }, POLL_MS);
    return () => {
      ac.abort();
      mounted.current = false;
      window.clearInterval(id);
    };
  }, [fetchHealth]);

  return { loading, error, triadFullyLive, livePanelists, panelistRoutes, agentAjiChatFusion, influence };
}
