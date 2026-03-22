'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AICandidate } from '@alchemist/shared-types';
import {
  formatPanelistDisplayName,
  formatPanelistSoundTagline,
  isServerDemoCandidate,
} from '../../lib/panelist-ui';
import { useWebMidi } from '../../hooks/useWebMidi';
import { useResolvedMercuryTier } from '../../hooks/useResolvedMercuryTier';
import { EarModeController, type EarModeStatus } from './EarModeController';
import { MercuryBallClient } from './MercuryBallClient';
import { MercuryBallShell } from './MercuryBallShell';
import { TriadSamplePlayer } from './TriadSamplePlayer';
import { MERCURY_ORB_FRAME_CLASS } from '../../lib/mercury-orb-frame';
import { playPresetChime, type ChimeHandle } from '../../lib/preset-preview-chime';

export type WasmHealthStatus = 'loading' | 'available' | 'unavailable';

export interface PromptAudioDockProps {
  hasPresets: boolean;
  candidates: AICandidate[];
  onAppendPrompt: (text: string) => void;
  onListeningChange: (listening: boolean) => void;
  onExportTopPreset?: () => void | Promise<void>;
  canExportTopPreset: boolean;
  wasmStatus: WasmHealthStatus;
}

/**
 * Gravity well: mercury orb + export row + sample player (see `apps/web-app/docs/MERCURY-BALL.md`).
 */
export function PromptAudioDock({
  hasPresets,
  candidates,
  onAppendPrompt,
  onListeningChange,
  onExportTopPreset,
  canExportTopPreset,
  wasmStatus,
}: PromptAudioDockProps) {
  const midi = useWebMidi();
  const mercuryTier = useResolvedMercuryTier(hasPresets);

  const handleListening = useCallback(
    (s: EarModeStatus) => {
      onListeningChange(s.isActive);
    },
    [onListeningChange],
  );

  useEffect(() => {
    if (hasPresets) onListeningChange(false);
  }, [hasPresets, onListeningChange]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const chimeRef = useRef<ChimeHandle | null>(null);
  const tapBoostClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [orbTapBoost, setOrbTapBoost] = useState(0);

  useEffect(() => {
    return () => {
      if (tapBoostClearRef.current) clearTimeout(tapBoostClearRef.current);
    };
  }, []);

  const playOrbSample = useCallback(async () => {
    const t = candidates[0];
    if (!t) return;
    if (tapBoostClearRef.current) clearTimeout(tapBoostClearRef.current);
    setOrbTapBoost(1);
    tapBoostClearRef.current = setTimeout(() => {
      setOrbTapBoost(0);
      tapBoostClearRef.current = null;
    }, 420);

    chimeRef.current?.stop();
    const Ctx =
      typeof window !== 'undefined'
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : null;
    if (!Ctx) return;
    if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
    chimeRef.current = playPresetChime(ctx, t);
    window.setTimeout(() => {
      chimeRef.current = null;
    }, 500);
  }, [candidates]);

  if (hasPresets) {
    const top = candidates[0];
    const midiPlaybackPath = midi.hasConnectedInput;
    const orbVividness = Math.min(1, 0.74 + midi.midiNorm * 0.22 + orbTapBoost * 0.28);

    return (
      <div className="relative z-20 mt-10">
        {wasmStatus === 'unavailable' && (
          <p className="mb-3 text-left text-[11px] text-amber-200/80">
            Export unavailable · WASM encoder not built
          </p>
        )}

        <div className="relative w-full">
          <p className="mb-3 text-left text-[11px] leading-relaxed text-[#5EEAD4]">
            {midiPlaybackPath
              ? 'Touch MIDI keys to play the sound.'
              : 'Tap the ball to hear a quick preset sample.'}
          </p>

          <MercuryBallShell
            midiNorm={Math.min(1, midi.midiNorm + orbTapBoost * 0.35)}
            isHot={false}
            idleTranslucent
            onOrbActivate={playOrbSample}
            ariaLabel="Play a short web preview of the top preset"
            className="w-full"
          >
            <div className={MERCURY_ORB_FRAME_CLASS}>
              <MercuryBallClient
                vividness={orbVividness}
                isEarMode={false}
                fitParent
                earTier={mercuryTier}
              />
            </div>
          </MercuryBallShell>

          {top ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold text-[#5EEAD4]">
                  {formatPanelistDisplayName(top.panelist)}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-gray-400">
                  {formatPanelistSoundTagline(top.panelist)}
                </p>
                {!midiPlaybackPath && !isServerDemoCandidate(top) && top.reasoning ? (
                  <p className="mt-2 max-w-[min(100%,14rem)] text-[11px] leading-relaxed text-gray-500 line-clamp-2 sm:max-w-xs">
                    {top.reasoning}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 self-center">
                {typeof onExportTopPreset === 'function' ? (
                  <button
                    type="button"
                    disabled={!canExportTopPreset}
                    title={
                      wasmStatus === 'unavailable'
                        ? 'WASM encoder unavailable — build fxp-encoder to export'
                        : wasmStatus === 'loading'
                          ? 'Checking encoder…'
                          : undefined
                    }
                    onClick={() => void onExportTopPreset()}
                    className="whitespace-nowrap rounded-xl border border-[#5EEAD4] bg-[#111827] px-4 py-2.5 text-xs font-semibold text-[#5EEAD4] transition-opacity hover:bg-[#5EEAD4]/10 disabled:cursor-not-allowed disabled:border-gray-600 disabled:text-gray-600"
                  >
                    {wasmStatus === 'loading' ? 'Encoder…' : 'Export .fxp'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {top && !midiPlaybackPath ? (
            <div className="mt-6 space-y-4">
              <TriadSamplePlayer candidates={candidates} variant="dock" />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-20 mt-10">
      <EarModeController
        compact
        showChromeCopy={false}
        earTier={mercuryTier}
        midiGlowNorm={midi.midiNorm}
        onAppendPrompt={onAppendPrompt}
        onStatusChange={handleListening}
      />
    </div>
  );
}
