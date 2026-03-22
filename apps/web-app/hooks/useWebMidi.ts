'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface WebMidiState {
  /** 0–1 norm from recent Note-On velocity (decays over time). */
  midiNorm: number;
  hasConnectedInput: boolean;
}

const DECAY_MS = 280;

export function useWebMidi(): WebMidiState {
  const [midiNorm, setMidiNorm] = useState(0);
  const [hasConnectedInput, setHasConnectedInput] = useState(false);
  const decayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bump = useCallback((velocity: number) => {
    const n = Math.min(1, velocity / 127);
    setMidiNorm((prev) => Math.min(1, Math.max(prev, n)));
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      return;
    }

    let access: MIDIAccess | null = null;
    const onMessage = (e: MIDIMessageEvent) => {
      const data = e.data;
      if (!data || data.length < 3) return;
      const status = data[0] ?? 0;
      if ((status & 0xf0) === 0x90 && (data[2] ?? 0) > 0) {
        bump(data[2] ?? 0);
      }
    };

    const wire = (a: MIDIAccess) => {
      access = a;
      const inputs = Array.from(a.inputs.values());
      setHasConnectedInput(inputs.length > 0);
      for (const input of inputs) {
        input.addEventListener('midimessage', onMessage as EventListener);
      }
    };

    void (navigator as Navigator & { requestMIDIAccess(): Promise<MIDIAccess> })
      .requestMIDIAccess()
      .then(wire)
      .catch(() => {
        setHasConnectedInput(false);
      });

    return () => {
      if (!access) return;
      for (const input of Array.from(access.inputs.values())) {
        input.removeEventListener('midimessage', onMessage as EventListener);
      }
    };
  }, [bump]);

  useEffect(() => {
    if (midiNorm <= 0.001) return;
    if (decayRef.current) clearInterval(decayRef.current);
    decayRef.current = setInterval(() => {
      setMidiNorm((v) => {
        const next = v * 0.92;
        return next < 0.02 ? 0 : next;
      });
    }, DECAY_MS);
    return () => {
      if (decayRef.current) clearInterval(decayRef.current);
    };
  }, [midiNorm]);

  return { midiNorm, hasConnectedInput };
}
