'use client';

export type AudioPromptControls = {
  stop: () => void;
  abort: () => void;
};

type Rec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: Event) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: Event) => void) | null;
};

type Handlers = {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onSessionEnd: () => void;
  onError: (code: string) => void;
};

export function isAudioPromptSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
  );
}

export function describeSpeechError(code: string): string | null {
  const map: Record<string, string> = {
    'not-allowed': 'Microphone permission denied.',
    'no-speech': 'No speech detected. Try again.',
    'network': 'Speech recognition network error.',
    'aborted': '',
  };
  return map[code] ?? (code ? `Speech error: ${code}` : null);
}

export function startAudioPrompt(handlers: Handlers, lang: string): AudioPromptControls | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Rec;
    webkitSpeechRecognition?: new () => Rec;
  };
  const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();

  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = lang;

  rec.onresult = (event: Event) => {
    const e = event as unknown as {
      resultIndex: number;
      results: { length: number; item: (i: number) => { isFinal: boolean; 0: { transcript: string } } };
    };
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results.item(i);
      const t = r[0]?.transcript ?? '';
      if (r.isFinal) final += t;
      else interim += t;
    }
    if (interim) handlers.onInterim(interim);
    if (final) handlers.onFinal(final);
  };

  rec.onend = () => {
    handlers.onSessionEnd();
  };

  rec.onerror = (event: Event) => {
    const err = event as unknown as { error?: string };
    handlers.onError(err.error ?? 'unknown');
  };

  try {
    rec.start();
  } catch {
    return null;
  }

  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* */
      }
    },
    abort: () => {
      try {
        rec.abort();
      } catch {
        /* */
      }
    },
  };
}
