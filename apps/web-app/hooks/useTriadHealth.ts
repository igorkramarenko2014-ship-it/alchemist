'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface TriadHealthState {
  loading: boolean;
  error: boolean;
  triadFullyLive: boolean;
  livePanelists: string[];
  panelistRoutes: string;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function parseTriadFromHealth(data: unknown): Pick<
  TriadHealthState,
  'triadFullyLive' | 'livePanelists' | 'panelistRoutes'
> | null {
  if (!isRecord(data)) return null;
  const triad = data.triad;
  if (!isRecord(triad)) return null;
  const triadFullyLive = triad.triadFullyLive === true;
  const livePanelists = Array.isArray(triad.livePanelists)
    ? triad.livePanelists.filter((x): x is string => typeof x === 'string')
    : [];
  const panelistRoutes = typeof triad.panelistRoutes === 'string' ? triad.panelistRoutes : '';
  return { triadFullyLive, livePanelists, panelistRoutes };
}

const POLL_MS = 30_000;

export function useTriadHealth(): TriadHealthState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [triadFullyLive, setTriadFullyLive] = useState(false);
  const [livePanelists, setLivePanelists] = useState<string[]>([]);
  const [panelistRoutes, setPanelistRoutes] = useState('');
  const mounted = useRef(true);

  const fetchHealth = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store', signal });
      if (!res.ok) {
        if (!mounted.current) return;
        setError(true);
        setLoading(false);
        return;
      }
      const json: unknown = await res.json();
      const parsed = parseTriadFromHealth(json);
      if (!mounted.current) return;
      if (!parsed) {
        setError(true);
        setLoading(false);
        return;
      }
      setTriadFullyLive(parsed.triadFullyLive);
      setLivePanelists(parsed.livePanelists);
      setPanelistRoutes(parsed.panelistRoutes);
      setError(false);
      setLoading(false);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (!mounted.current) return;
      setError(true);
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

  return { loading, error, triadFullyLive, livePanelists, panelistRoutes };
}
