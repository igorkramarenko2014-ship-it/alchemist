'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MercuryBallClient } from './MercuryBallClient';
import { MercuryBallShell } from './MercuryBallShell';
import {
  describeSpeechError,
  isAudioPromptSupported,
  startAudioPrompt,
  type AudioPromptControls,
} from '../../lib/audio-prompt-module';
import type { EarTier } from '../../lib/ear-tier';
import { MERCURY_ORB_FRAME_CLASS } from '../../lib/mercury-orb-frame';

/** Web Speech API recognition locale — product is English-only. */
const SPEECH_RECOGNITION_LANG = 'en-US';

export interface EarModeStatus {
  isActive: boolean;
  interimText: string;
  userVisibleError: string | null;
}

export interface EarModeControllerProps {
  onAppendPrompt: (text: string) => void;
  onStatusChange?: (status: EarModeStatus) => void;
  compact?: boolean;
  showChromeCopy?: boolean;
  midiGlowNorm?: number;
  earTier?: EarTier;
}

export function EarModeController({
  onAppendPrompt,
  onStatusChange,
  compact = false,
  showChromeCopy = true,
  midiGlowNorm = 0,
  earTier = 'basic',
}: EarModeControllerProps) {
  const [clientReady, setClientReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [vividness, setVividness] = useState(0.72);

  const controlsRef = useRef<AudioPromptControls | null>(null);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    onStatusChangeRef.current?.({
      isActive: isListening,
      interimText,
      userVisibleError: error,
    });
  }, [isListening, interimText, error]);

  useEffect(() => {
    setSupported(isAudioPromptSupported());
    setClientReady(true);
  }, []);

  useEffect(() => {
    return () => {
      controlsRef.current?.abort();
    };
  }, []);

  const stopListening = useCallback(
    (opts?: { flushInterim?: boolean }) => {
      const interim = interimText.trim();
      if (opts?.flushInterim && interim) {
        onAppendPrompt(interim);
      }
      setInterimText('');
      controlsRef.current?.stop();
      controlsRef.current = null;
      setIsListening(false);
    },
    [interimText, onAppendPrompt],
  );

  const startListening = useCallback(() => {
    if (!supported) return;
    setError(null);
    setInterimText('');
    controlsRef.current?.abort();

    const ctrl = startAudioPrompt(
      {
        onInterim: (t) => {
          setInterimText(t);
          if (t) {
            setVividness((v) => Math.min(1, v + 0.04));
            window.setTimeout(() => setVividness((v) => Math.max(0.55, v - 0.03)), 160);
          }
        },
        onFinal: (t) => {
          if (t.trim()) {
            onAppendPrompt(t.trim());
            setVividness((v) => Math.min(1, v + 0.08));
            window.setTimeout(() => setVividness((v) => Math.max(0.55, v - 0.05)), 200);
          }
          setInterimText('');
        },
        onSessionEnd: () => {
          controlsRef.current = null;
          setIsListening(false);
          setInterimText('');
        },
        onError: (code) => {
          const msg = describeSpeechError(code);
          if (msg) setError(msg);
        },
      },
      SPEECH_RECOGNITION_LANG,
    );

    if (!ctrl) {
      setError('Speech recognition is not available in this browser.');
      return;
    }

    controlsRef.current = ctrl;
    setIsListening(true);
  }, [supported, onAppendPrompt]);

  const orbHeight = compact ? 'h-[220px] md:h-[280px]' : 'h-[280px] md:h-[360px]';

  if (!clientReady) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 py-2">
        <div
          className={`mx-auto w-full max-w-md rounded-2xl ${orbHeight} animate-pulse bg-gray-800/35`}
          aria-hidden
        />
        <p className="text-xs text-gray-600">Checking speech support…</p>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-center text-sm text-gray-500">
        <p className="font-medium text-gray-400">Sound → parse prompt</p>
        <p className="mt-2 text-xs">Speech not supported in this browser.</p>
      </div>
    );
  }

  const effVividness = Math.min(1, vividness + midiGlowNorm * 0.22);
  const voiceShellBoost =
    earTier === 'ultra' && isListening
      ? Math.min(0.42, interimText.length / 90 + (interimText.trim() ? 0.1 : 0))
      : 0;
  const shellGlowNorm = Math.min(1, midiGlowNorm + voiceShellBoost);
  const orbStartsEarMode = compact;

  return (
    <div className="flex w-full flex-col items-stretch justify-center gap-5">
      <div className="relative w-full">
        {orbStartsEarMode && !isListening ? (
          <p className="mb-3 text-left text-[11px] leading-relaxed text-[#5EEAD4]">
            Press the ball to enter ear mode.
          </p>
        ) : null}
        <MercuryBallShell
          midiNorm={shellGlowNorm}
          isHot={isListening}
          idleTranslucent={!isListening}
          onOrbActivate={orbStartsEarMode && !isListening ? startListening : undefined}
          ariaLabel={
            orbStartsEarMode
              ? isListening
                ? 'Ear mode is on'
                : 'Press to enter ear mode — speak to add to your prompt'
              : undefined
          }
          className="w-full"
        >
          <div
            className={
              compact
                ? MERCURY_ORB_FRAME_CLASS
                : `relative isolate w-full overflow-hidden rounded-2xl border border-gray-800/40 bg-[#111827]/40 p-3 md:p-4 ${orbHeight}`
            }
          >
            <MercuryBallClient vividness={effVividness} isEarMode={isListening} fitParent earTier={earTier} />
          </div>
        </MercuryBallShell>
      </div>

      <div className="relative z-10 w-full space-y-3 text-center">
        {showChromeCopy ? (
          <>
            <p className="text-xs uppercase tracking-wide text-gray-500">Sound → parse prompt</p>
            <p className="text-sm text-gray-400">Mic + speech · final phrases append to the prompt.</p>
          </>
        ) : null}

        {error && (
          <p className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-200/90">
            {error}
          </p>
        )}

        {isListening && interimText ? (
          <p className="text-sm italic text-[#5EEAD4]/85">&ldquo;{interimText}&rdquo;</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {orbStartsEarMode ? (
            isListening ? (
              <button
                type="button"
                onClick={() => stopListening({ flushInterim: true })}
                className="border-b-2 border-gray-500 bg-transparent px-6 py-2 text-base font-semibold text-gray-300 transition-colors hover:border-gray-400"
              >
                Stop
              </button>
            ) : null
          ) : !isListening ? (
            <button
              type="button"
              onClick={startListening}
              className="border-b-2 border-[#5EEAD4] bg-transparent px-6 py-2 text-base font-semibold text-[#5EEAD4] transition-colors hover:bg-[#5EEAD4]/10"
            >
              Start microphone
            </button>
          ) : (
            <button
              type="button"
              onClick={() => stopListening({ flushInterim: true })}
              className="border-b-2 border-gray-500 bg-transparent px-6 py-2 text-base font-semibold text-gray-300 transition-colors hover:border-gray-400"
            >
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
