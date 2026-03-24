"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  computeAgentAjiChatFusionFromTriadTelemetry,
  encodeFxp,
  makeTriadFetcher,
  runTriad,
  scoreCandidates,
  type AICandidate,
} from "@alchemist/shared-engine";
import { TriadHealth } from "@/components/TriadHealth";
import { PromptAudioDock, type WasmHealthStatus } from "@/components/ui/PromptAudioDock";
import { TokenUsageIndicator } from "@/components/ui/TokenUsageIndicator";
import { formatPanelistDisplayName } from "@/lib/panelist-ui";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranked, setRanked] = useState<AICandidate[]>([]);
  const [validationSummary, setValidationSummary] = useState<string | null>(null);
  const [wasmStatus, setWasmStatus] = useState<WasmHealthStatus>("loading");
  const [postRunAgentFusionLine, setPostRunAgentFusionLine] = useState<string | null>(null);
  const triadAbortRef = useRef<AbortController | null>(null);
  /** Prevents a superseded triad from clearing `loading` while a newer run is active. */
  const triadGenRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/health/wasm")
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setWasmStatus("unavailable");
          return;
        }
        let j: { status?: string; ok?: boolean; wasmArtifactTruth?: string };
        try {
          j = (await r.json()) as { status?: string; ok?: boolean; wasmArtifactTruth?: string };
        } catch {
          setWasmStatus("unavailable");
          return;
        }
        if (cancelled) return;
        if (j?.ok && j?.status === "available" && j?.wasmArtifactTruth === "real") {
          setWasmStatus("available");
        }
        else if (j?.status === "loading") setWasmStatus("loading");
        else setWasmStatus("unavailable");
      })
      .catch(() => {
        if (!cancelled) setWasmStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const appendPrompt = useCallback((text: string) => {
    setPrompt((p) => (p ? `${p} ${text}` : text));
  }, []);

  const onListeningChange = useCallback((_listening: boolean) => {
    /* reserved: ear-mode telemetry / UI hooks */
  }, []);

  useEffect(() => {
    return () => {
      triadAbortRef.current?.abort();
    };
  }, []);

  const handleRun = useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;

    triadAbortRef.current?.abort();
    const ac = new AbortController();
    triadAbortRef.current = ac;
    const { signal } = ac;
    const gen = ++triadGenRef.current;

    setLoading(true);
    setError(null);
    setRanked([]);
    setValidationSummary(null);
    setPostRunAgentFusionLine(null);
    try {
      const analysis = await runTriad(text, {
        /** Server routes: `app/api/triad/{llama,deepseek,qwen}` (FIRE §B2). */
        fetcher: makeTriadFetcher(false, ""),
        // Disabled: real LLM paramArray values fail strict consensus check.
        // Re-enable after gate calibration with real data confirms paramArray quality.
        runConsensusValidation: false,
        signal,
      });
      if (signal.aborted || triadGenRef.current !== gen) return;
      const sorted = scoreCandidates(analysis.candidates, text);
      setRanked(sorted);
      if (sorted.length === 0 && !analysis.validationSummary) {
        setError(
          "No preset candidates returned. The triad requests may have failed (network or timeout), or every candidate was filtered by preset gates. Confirm the dev server is running and try again.",
        );
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("alchemist:usage-update"));
      }
      if (analysis.validationSummary) setValidationSummary(analysis.validationSummary);
      if (analysis.triadRunTelemetry) {
        const fusion = computeAgentAjiChatFusionFromTriadTelemetry(analysis.triadRunTelemetry);
        setPostRunAgentFusionLine(fusion.fusionLines[0] ?? null);
      }
    } catch (e) {
      if (signal.aborted || triadGenRef.current !== gen) return;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "Triad aborted" || /abort/i.test(msg)) return;
      setError(msg);
    } finally {
      if (triadGenRef.current === gen) setLoading(false);
    }
  }, [prompt]);

  async function handleExportTop() {
    const c = ranked[0];
    if (!c) return;
    await handleExport(c, `Alchemist-${c.panelist}-1`);
  }

  async function handleExport(c: AICandidate, name: string) {
    try {
      const params = new Float32Array(2);
      const bytes = await encodeFxp(params, name);
      const copy = new Uint8Array(bytes.length);
      copy.set(bytes);
      const blob = new Blob([copy], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/\s+/g, "-")}.fxp`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const hasPresets = ranked.length > 0;

  return (
    <main className="mx-auto w-full max-w-[min(100%,22.5rem)] px-5 pb-14 pt-6 sm:max-w-md sm:px-6 sm:pt-8">
      {/* Video ref: title left, token pill right — same header band */}
      <header className="mb-7 flex flex-wrap items-start justify-between gap-x-3 gap-y-2 sm:mb-8">
        <h1 className="min-w-0 flex-1 pt-0.5 text-2xl font-bold leading-none tracking-tight text-[#5EEAD4] drop-shadow-[0_0_14px_rgba(94,234,212,0.4)]">
          Alchemist
        </h1>
        <div className="flex w-full flex-col items-stretch gap-2 sm:mt-0.5 sm:w-auto sm:items-end">
          <TriadHealth />
          <TokenUsageIndicator variant="inline" className="self-end sm:shrink-0" />
        </div>
      </header>

      <section className="space-y-2" aria-busy={loading}>
        <label htmlFor="alchemist-prompt" className="block text-sm font-normal text-gray-200">
          Prompt
        </label>
        <textarea
          id="alchemist-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey) return;
            if (e.nativeEvent.isComposing) return;
            e.preventDefault();
            void handleRun();
          }}
          placeholder="909 kick…"
          disabled={loading}
          rows={3}
          autoComplete="off"
          spellCheck
          className="box-border min-h-[5.25rem] w-full resize-none rounded-xl border border-[#5EEAD4] bg-[#5EEAD4]/10 px-4 py-3 text-base text-white placeholder:text-gray-500 shadow-[inset_0_0_0_1px_rgba(94,234,212,0.15)] focus:border-[#5EEAD4] focus:outline-none focus:ring-1 focus:ring-[#5EEAD4]/45"
        />
        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={loading || !prompt.trim()}
          className="mt-3 w-full rounded-xl bg-[#5EEAD4] px-5 py-3.5 text-base font-semibold text-[#111827] shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-400 disabled:opacity-80"
        >
          {loading ? "Generating…" : "Generate presets"}
        </button>
      </section>

      {hasPresets && ranked[0] ? (
        <section
          className="mt-6 rounded-r-xl border border-gray-800 border-l-4 border-l-[#5EEAD4] bg-[#1a1a1a] px-4 py-3 shadow-sm"
          aria-label="Top ranked result"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Top result</p>
          <p className="mt-1 text-lg font-semibold text-[#5EEAD4]">
            {formatPanelistDisplayName(ranked[0].panelist)}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            Score {(ranked[0].score * 100).toFixed(0)}% · triad #1
          </p>
          {ranked[0].reasoning ? (
            <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-gray-500">{ranked[0].reasoning}</p>
          ) : null}
        </section>
      ) : null}

      <PromptAudioDock
        hasPresets={hasPresets}
        candidates={ranked}
        onAppendPrompt={appendPrompt}
        onListeningChange={onListeningChange}
        onExportTopPreset={handleExportTop}
        canExportTopPreset={hasPresets && wasmStatus === "available"}
        wasmStatus={wasmStatus}
      />

      {error && (
        <div className="mt-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {validationSummary && (
        <div className="mt-6 rounded-lg border border-gray-700 bg-gray-900/60 px-4 py-3 text-sm text-gray-400">
          <strong className="text-brand-primary">Consensus validation</strong>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-xs">{validationSummary}</pre>
        </div>
      )}

      {postRunAgentFusionLine ? (
        <p
          className="mt-4 text-[10px] leading-snug text-gray-500 line-clamp-3"
          title={postRunAgentFusionLine}
        >
          {postRunAgentFusionLine}
        </p>
      ) : null}

    </main>
  );
}
