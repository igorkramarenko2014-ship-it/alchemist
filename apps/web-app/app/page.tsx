"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { buildFxpExportProvenanceV1, fxpProvenanceSidecarFilename } from "@alchemist/shared-engine/fxp-provenance";
import { computeAgentAjiChatFusionFromTriadTelemetry } from "@alchemist/shared-engine/agent-fusion";
import { encodeFxp } from "@alchemist/shared-engine/encoder";
import { generateDecisionReceipt } from "@alchemist/shared-engine/explainability/decision-receipt";
import { makeTriadFetcher, runTriad } from "@alchemist/shared-engine/triad";
import { scoreCandidates } from "@alchemist/shared-engine/score";
import type { AIAnalysis, AICandidate, DecisionReceipt } from "@alchemist/shared-types";
import { REALITY_TELEMETRY_EVENTS } from "@alchemist/shared-types";
import { TriadHealth } from "@/components/TriadHealth";
import { PromptAudioDock, type WasmHealthStatus } from "@/components/ui/PromptAudioDock";
import { TokenUsageIndicator } from "@/components/ui/TokenUsageIndicator";
import { formatPanelistDisplayName } from "@/lib/panelist-ui";
import { getCorpusScoringLessons } from "@/app/actions/corpus-scoring-lessons";
import { getTasteIndexForScoring } from "@/app/actions/taste-index-for-scoring";

export default function Home() {
  const iomAllowsStubLearning =
    process.env.NEXT_PUBLIC_ALCHEMIST_IOM_ALLOW_STUB_LEARNING === "1";
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranked, setRanked] = useState<AICandidate[]>([]);
  const [validationSummary, setValidationSummary] = useState<string | null>(null);
  const [wasmStatus, setWasmStatus] = useState<WasmHealthStatus>("loading");
  const [postRunAgentFusionLine, setPostRunAgentFusionLine] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [decisionReceipt, setDecisionReceipt] = useState<DecisionReceipt | null>(null);
  const triadAbortRef = useRef<AbortController | null>(null);
  /** Prevents a superseded triad from clearing `loading` while a newer run is active. */
  const triadGenRef = useRef(0);
  /** Last successful Generate — export provenance + lineage gate. */
  const lastRunPromptRef = useRef<string>("");
  const lastAnalysisRef = useRef<AIAnalysis | null>(null);
  /** Learning eligibility for the last run: stub lanes are blocked unless explicitly IOM-allowed. */
  const lastRunLearningEligibleRef = useRef<boolean>(true);

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
    setShareLink(null);
    setDecisionReceipt(null);
    try {
      const analysis = await runTriad(text, {
        /** Server routes: `app/api/triad/{llama,deepseek,qwen}` (FIRE §B2). */
        fetcher: makeTriadFetcher(false, ""),
        // Disabled: real LLM paramArray values fail strict consensus check.
        // Re-enable after gate calibration with real data confirms paramArray quality.
        runConsensusValidation: false,
        signal,
        onTokenUsage: (p) => {
          void fetch("/api/usage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p),
          });
        },
      });
      if (signal.aborted || triadGenRef.current !== gen) return;
      const tel = analysis.triadRunTelemetry;
      const pnhScoringLane =
        tel?.pnhContextSurface?.triadLaneClass === "stub"
          ? ("stub" as const)
          : tel?.pnhContextSurface?.triadLaneClass === "mixed"
            ? ("mixed" as const)
            : tel?.pnhContextSurface?.triadLaneClass === "fully_live"
              ? ("fully_live" as const)
              : ("fully_live" as const);
      const corpusLessons = await getCorpusScoringLessons();
      const tasteIndex = await getTasteIndexForScoring();
      const sorted = scoreCandidates(
        analysis.candidates,
        analysis.triadExecutionPrompt ?? text,
        undefined,
        {
          pnhScoringLane,
          corpusAffinityPrior: corpusLessons.length > 0,
          learningLessons: corpusLessons,
          tastePrior: tasteIndex != null,
          tasteIndex,
        },
      );
      lastRunPromptRef.current = text;
      lastAnalysisRef.current = analysis;
      let finalSorted = sorted;
      let finalAnalysis = analysis;
      let usedStubFallback = false;
      if (sorted.length === 0 && !analysis.validationSummary) {
        // Plan Z only: stub is a last-resort continuity path when live triad cannot return usable output.
        // Product/learning decisions must continue to optimize for live lanes first.
        const fallback = await runTriad(text, {
          fetcher: makeTriadFetcher(true, ""),
          runConsensusValidation: false,
          signal,
        });
        const fallbackSorted = scoreCandidates(
          fallback.candidates,
          fallback.triadExecutionPrompt ?? text,
          undefined,
          {
            pnhScoringLane: "stub",
            corpusAffinityPrior: corpusLessons.length > 0,
            learningLessons: corpusLessons,
            tastePrior: tasteIndex != null,
            tasteIndex,
          },
        );
        if (fallbackSorted.length > 0) {
          finalSorted = fallbackSorted;
          finalAnalysis = fallback;
          usedStubFallback = true;
          setError(
            "Live triad degraded (provider/breaker path). Plan Z continuity activated: deterministic stub fallback output (minimize usage, investigate live lane health).",
          );
        } else {
          setError(
            "No preset candidates returned. Live triad failed and stub fallback also produced no candidates.",
          );
        }
      }
      setRanked(finalSorted);
      lastAnalysisRef.current = finalAnalysis;
      const finalLane = finalAnalysis.triadRunTelemetry?.pnhContextSurface?.triadLaneClass;
      const finalRunIsStub = usedStubFallback || finalLane === "stub";
      lastRunLearningEligibleRef.current = !finalRunIsStub || iomAllowsStubLearning;
      setDecisionReceipt(
        generateDecisionReceipt(finalAnalysis, finalSorted, {
          wasmStatus: wasmStatus === "available" ? "available" : "unavailable",
          hardGateStatus: "enforced",
          stubUsage: finalRunIsStub,
        })
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("alchemist:usage-update"));
      }
      if (finalAnalysis.validationSummary) setValidationSummary(finalAnalysis.validationSummary);
      if (finalAnalysis.triadRunTelemetry) {
        const fusion = computeAgentAjiChatFusionFromTriadTelemetry(finalAnalysis.triadRunTelemetry);
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
  }, [iomAllowsStubLearning, prompt, wasmStatus]);

  const handleShareTop = useCallback(async () => {
    const c = ranked[0];
    if (!c) return;
    const promptNow = prompt.trim();
    if (promptNow !== lastRunPromptRef.current) {
      setError("Share blocked: prompt changed since last Generate — run Generate again.");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/presets/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: c,
          prompt: promptNow,
          score: c.score,
          wasmAvailable: wasmStatus === "available",
          learningEligible: lastRunLearningEligibleRef.current,
          learningPolicy:
            lastRunLearningEligibleRef.current
              ? "live_only_default"
              : "stub_blocked_unless_iom",
          decisionReceipt: decisionReceipt ?? undefined,
        }),
      });
      const j = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) {
        setError(j.error ?? "Share failed");
        return;
      }
      if (typeof j.url === "string") {
        const abs = `${window.location.origin}${j.url}`;
        setShareLink(abs);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [decisionReceipt, ranked, prompt, wasmStatus]);

  async function handleExportTop() {
    const c = ranked[0];
    if (!c) return;
    await handleExport(c, `Alchemist-${c.panelist}-1`);
  }

  async function handleExport(c: AICandidate, name: string) {
    try {
      type RealityTelemetryKind = keyof typeof REALITY_TELEMETRY_EVENTS;
      const postReality = async (
        kind: RealityTelemetryKind,
        payload: Record<string, unknown>
      ): Promise<void> => {
        try {
          await fetch("/api/reality/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, payload }),
          });
        } catch {
          // Observability only: export must still succeed even if telemetry endpoint is down.
        }
      };

      const promptNow = prompt.trim();
      if (promptNow !== lastRunPromptRef.current) {
        setError("Export blocked: prompt changed since last Generate — run Generate again for a traceable export.");
        return;
      }
      const exportRankIndex = ranked.findIndex(
        (x) => x.panelist === c.panelist && x.score === c.score && x.reasoning === c.reasoning
      );
      let healthJson: unknown | null = null;
      try {
        const hr = await fetch("/api/health", { cache: "no-store" });
        if (hr.ok) healthJson = await hr.json();
      } catch {
        healthJson = null;
      }
      const wasmReal = wasmStatus === "available";

      // Outcome/observability signals (RLL) — hinting only; no gate law mutation.
      // OUTPUT_USED is a learning signal. Stub runs are excluded unless IOM explicitly allows it.
      if (lastRunLearningEligibleRef.current) {
        const outputUsedPayload = { surface: "export", panelist: c.panelist } as const;
        void postReality("OUTPUT_USED", outputUsedPayload);
      }
      const exportAttemptPayload = {
        wasmAvailable: wasmReal,
        candidateRank: exportRankIndex >= 0 ? exportRankIndex : 0,
        panelist: c.panelist,
        learningEligible: lastRunLearningEligibleRef.current,
        learningPolicy: lastRunLearningEligibleRef.current
          ? "live_only_default"
          : "stub_blocked_unless_iom",
      } as const;
      void postReality("EXPORT_ATTEMPTED", exportAttemptPayload);

      const prov = await buildFxpExportProvenanceV1({
        prompt: promptNow,
        analysis: lastAnalysisRef.current,
        rankedAfterScore: ranked,
        exportCandidate: c,
        exportRankIndex: exportRankIndex >= 0 ? exportRankIndex : 0,
        programName: name,
        wasmReal,
        healthResponseJson: healthJson,
        promptMatchesLastRun: promptNow === lastRunPromptRef.current,
      });
      const params = new Float32Array(2);
      const bytes = await encodeFxp(params, name);
      const copy = new Uint8Array(bytes.length);
      copy.set(bytes);
      const fxpBase = `${name.replace(/\s+/g, "-")}.fxp`;
      const blob = new Blob([copy], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fxpBase;
      a.click();
      URL.revokeObjectURL(url);
      const sideText = JSON.stringify(prov, null, 2);
      const sideBlob = new Blob([sideText], { type: "application/json" });
      const sideUrl = URL.createObjectURL(sideBlob);
      const a2 = document.createElement("a");
      a2.href = sideUrl;
      a2.download = fxpProvenanceSidecarFilename(fxpBase);
      a2.click();
      URL.revokeObjectURL(sideUrl);

      // Export succeeded: bytes generated and sidecar provenance produced.
      void postReality("EXPORT_SUCCEEDED", {
        exportTrustTier: prov.exportTrustTier,
        wasmReal,
        candidateRank: exportRankIndex >= 0 ? exportRankIndex : 0,
        panelist: c.panelist,
      });
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
          <button
            type="button"
            onClick={() => void handleShareTop()}
            disabled={
              ranked[0].score < 0.85 ||
              (ranked[0].reasoning?.trim().length ?? 0) < 15 ||
              !Array.isArray(ranked[0].paramArray) ||
              ranked[0].paramArray.length === 0 ||
              prompt.trim() !== lastRunPromptRef.current
            }
            className="mt-3 w-full rounded-lg border border-[#5EEAD4]/40 bg-transparent px-3 py-2 text-xs font-medium text-[#5EEAD4] transition-colors hover:bg-[#5EEAD4]/10 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600"
          >
            Share preset (score ≥85%, needs params)
          </button>
          {shareLink ? (
            <p className="mt-2 break-all text-[10px] text-gray-500">
              Link:{" "}
              <a href={shareLink} className="text-[#5EEAD4] underline">
                {shareLink}
              </a>
            </p>
          ) : null}
          {decisionReceipt ? (
            <details className="mt-3 rounded-lg border border-gray-800 bg-[#131313] px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-[#5EEAD4]">
                Why this result?
              </summary>
              <div className="mt-2 space-y-2 text-[11px] text-gray-400">
                <p>
                  Triad mode: <span className="text-gray-300">{decisionReceipt.triadMode}</span>
                </p>
                <p>
                  Selected:{" "}
                  <span className="text-gray-300">
                    {decisionReceipt.selectedCandidateId ?? "none"}
                  </span>
                </p>
                <p className="text-gray-300">Reason:</p>
                <ul className="list-disc space-y-1 pl-4">
                  {decisionReceipt.selectionReason.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                {decisionReceipt.rejectionReasons.length > 0 ? (
                  <>
                    <p className="text-gray-300">Rejected / lower-ranked:</p>
                    <ul className="list-disc space-y-1 pl-4">
                      {decisionReceipt.rejectionReasons.map((r) => (
                        <li key={`${r.candidateId}:${r.reason}`}>
                          {r.candidateId}: {r.reason}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <p>
                  System state: wasm={decisionReceipt.systemState.wasmStatus}, hard_gate=
                  {decisionReceipt.systemState.hardGateStatus}, stub=
                  {decisionReceipt.systemState.stubUsage ? "used" : "not_used"}
                </p>
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

      <PromptAudioDock
        hasPresets={hasPresets}
        candidates={ranked}
        onAppendPrompt={appendPrompt}
        onListeningChange={onListeningChange}
        onExportTopPreset={handleExportTop}
        canExportTopPreset={
          hasPresets &&
          wasmStatus === "available" &&
          prompt.trim() !== "" &&
          prompt.trim() === lastRunPromptRef.current
        }
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

      <div className="mt-12 flex justify-center border-t border-white/5 pt-8">
        <Link 
          href="/ops/refinery" 
          className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 hover:text-[#5EEAD4] transition-colors"
        >
          Refinery Dashboard
        </Link>
      </div>

    </main>
  );
}
