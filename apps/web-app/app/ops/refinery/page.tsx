"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DriftRadar } from "@/components/refinery/DriftRadar";
import { AlignmentSparkline } from "@/components/refinery/AlignmentSparkline";
import { MercuryBall } from "@/components/ui/MercuryBall";

export default function RefineryPage() {
  const [token, setToken] = useState<string>("");
  const [authorized, setAuthorized] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    try {
      const url = `/api/ops/refinery?action=status${scenarioId ? `&scenario=${scenarioId}` : ""}`;
      const res = await fetch(url, {
        headers: { "x-ops-token": token },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setAuthorized(true);
      } else {
        setError("Unauthorized or Ops disabled");
      }
    } catch (e) {
      setError("Connection failed");
    }
  }, [token, scenarioId]);

  useEffect(() => {
    if (authorized) fetchStatus();
  }, [authorized, scenarioId, fetchStatus]);

  // 60-second status poll (passive situational awareness)
  useEffect(() => {
    if (authorized) {
      const timer = setInterval(fetchStatus, 60000);
      return () => clearInterval(timer);
    }
  }, [authorized, fetchStatus]);

  const onGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/refinery?action=aggregate", {
        method: "POST",
        headers: { "x-ops-token": token },
      });
      const data = await res.json();
      if (data.ok) {
        setSnapshot(data.snapshot);
        setSelectedIds(new Set(data.snapshot.proposals.map((p: any) => p.id)));
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("Aggregation failed");
    } finally {
      setLoading(false);
    }
  };

  const onApply = async () => {
    setIsApplying(true);
    try {
      const res = await fetch("/api/ops/refinery?action=apply", {
        method: "POST",
        headers: { "x-ops-token": token, "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotId: snapshot.id,
          selectedIds: Array.from(selectedIds),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSnapshot(null);
        await fetchStatus();
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("Apply failed");
    } finally {
      setIsApplying(false);
    }
  };

  const toggleNudge = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-[#5EEAD4] mb-4">Refinery Operator Access</h1>
          <p className="text-gray-400 text-sm mb-6 uppercase tracking-widest">Digital Igor Authorization Required</p>
          <input
            type="password"
            placeholder="X-Ops-Token"
            className="w-full bg-black/40 border border-teal-400/30 rounded-xl px-4 py-3 text-teal-400 placeholder-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-400/20 mb-4"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchStatus()}
          />
          <button 
            onClick={fetchStatus}
            className="w-full bg-[#5EEAD4] text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Authorize Pulse
          </button>
          {error && <p className="mt-4 text-red-400 text-xs text-center uppercase tracking-tighter">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-gray-100 p-4 md:p-8 selection:bg-teal-400/30">
      {/* Demo Mode / Scenario Header */}
      {scenarioId && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-teal-400 text-black py-1 text-[10px] font-black uppercase tracking-[0.3em] text-center">
           Narrative Playback Active: {status?.scenario?.name} • No Live Mutation
        </div>
      )}

      {/* Header with Liquid Mercury */}
      <header className="flex flex-row items-center justify-between gap-8 mb-12 relative pt-8 md:pt-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-3 h-3 rounded-full bg-teal-400 animate-pulse" />
             <h1 className="text-4xl font-bold tracking-tighter">REFINERY <span className="text-teal-400 font-light opacity-60">PULSE</span></h1>
          </div>
          <p className="text-gray-500 uppercase tracking-[0.2em] text-xs">Self-Correction Loop — MOVE 5</p>
        </div>

        <div className="flex items-center gap-4">
           {/* Scenario Selector */}
           <select 
             value={scenarioId || ""} 
             onChange={(e) => {
               setScenarioId(e.target.value || null);
               setSnapshot(null);
             }}
             className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] uppercase font-bold text-teal-400 focus:outline-none"
           >
              <option value="">Live Mode (Default)</option>
              <option value="creative-drift">Scenario: Creative Drift</option>
              <option value="budget-breach">Scenario: Budget Breach</option>
           </select>

           <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
              <div className="absolute inset-0 bg-teal-400/5 blur-[60px] rounded-full" />
              <MercuryBall vividness={0.8} />
           </div>
        </div>
      </header>

      {/* Digital Igor Narrative Layer */}
      {status?.scenario?.narrativePoints && (
        <section className="mb-12 animate-in fade-in slide-in-from-top duration-700">
           <div className="bg-teal-400/10 border-l-4 border-teal-400 p-6 rounded-r-3xl backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">Digital Igor / Flight Control</span>
              </div>
              <div className="space-y-3">
                 {status.scenario.narrativePoints.map((p: any, i: number) => (
                   <p key={i} className="text-sm font-mono text-gray-100 leading-relaxed max-w-2xl">
                      » {p.message}
                   </p>
                 ))}
              </div>
              <p className="mt-4 text-[9px] text-teal-400/60 uppercase font-mono tracking-tighter">Verified against Constitutional MON 117 stability.</p>
           </div>
        </section>
      )}

      {/* Grid of Situational Awareness */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <article className="col-span-1 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
           <h3 className="text-[10px] uppercase tracking-widest text-[#5EEAD4] font-bold mb-6">Alignment Pulse</h3>
           <div className="flex items-end justify-between gap-4">
              <div className="text-5xl font-mono tracking-tighter">{(status?.alignmentPulse?.avg * 100).toFixed(0)}</div>
              <div className="flex-1 pb-2">
                 <AlignmentSparkline values={status?.alignmentPulse?.values || []} width={200} height={60} />
              </div>
           </div>
           <p className="mt-4 text-[10px] text-gray-500 uppercase tracking-tighter">Mean outcome match over last 20 samples</p>
        </article>

        <article className="col-span-1 md:col-span-1 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
           <h3 className="text-[10px] uppercase tracking-widest text-[#5EEAD4] font-bold mb-4">Drift Radar</h3>
           <DriftRadar data={status?.driftRadar || []} />
           <p className="mt-4 text-[10px] text-gray-500 text-center uppercase tracking-tighter">±0.04 Constitutional safety budget occupancy</p>
        </article>

        <article className="col-span-1 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between">
           <div>
             <h3 className="text-[10px] uppercase tracking-widest text-[#5EEAD4] font-bold mb-6">Operator Manifest</h3>
             <div className="space-y-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                   <span className="text-xs text-gray-400">Version</span>
                   <span className="text-xs font-mono text-teal-400">v{status?.manifestVersion || 0}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                   <span className="text-xs text-gray-400">Active Nudges</span>
                   <span className="text-xs font-mono text-teal-400">{status?.activeOverridesCount || 0}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                   <span className="text-xs text-gray-400">Last Sync</span>
                   <span className="text-xs font-mono text-gray-500">{status?.generatedAt ? new Date(status.generatedAt).toLocaleTimeString() : "Never"}</span>
                </div>
             </div>
           </div>
           <button 
             onClick={onGenerate}
             disabled={loading}
             className="w-full mt-8 border border-teal-400 py-3 rounded-2xl text-teal-400 font-bold uppercase text-xs tracking-widest hover:bg-teal-400 hover:text-black transition-all disabled:opacity-50"
           >
             {loading ? "Recalculating Evidence..." : "Generate Proposals"}
           </button>
        </article>
      </section>

      {/* Review Mode Overlay */}
      {snapshot && (
        <section className="fixed inset-0 z-50 bg-[#020617]/90 backdrop-blur-2xl p-4 md:p-12 overflow-y-auto">
           <div className="max-w-4xl mx-auto border border-teal-400/20 bg-black/40 rounded-[3rem] p-8 md:p-12">
              <div className="flex justify-between items-start mb-12">
                 <div>
                   <h2 className="text-3xl font-bold tracking-tighter mb-2 underline decoration-teal-400/30 underline-offset-8">Review proposals</h2>
                   <p className="text-xs text-gray-500 uppercase tracking-widest">Snapshot: {snapshot.id}</p>
                 </div>
                 <button onClick={() => setSnapshot(null)} className="text-gray-500 hover:text-white uppercase text-[10px] tracking-widest">Close review</button>
              </div>

              <div className="space-y-4 mb-12">
                 {snapshot.proposals.map((p: any) => (
                    <div key={p.id} className={`group relative p-6 rounded-2xl border ${selectedIds.has(p.id) ? "border-teal-400/40 bg-teal-400/5" : "border-white/5 bg-white/5 opacity-60"} transition-all`}>
                       <div className="flex items-start gap-4">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleNudge(p.id)}
                            className="w-5 h-5 mt-1 rounded border-teal-400 text-teal-400 focus:ring-teal-400 bg-black/50 cursor-pointer"
                          />
                          <div className="flex-1">
                             <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold uppercase tracking-widest text-[#5EEAD4]">{p.policyFamily} » {p.taskType || "Global"}</span>
                                <span className="text-[10px] font-mono text-gray-600">ID: {p.id.split("_").pop()}</span>
                             </div>
                             <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                   <p className="text-gray-500 uppercase text-[9px] mb-1">Evidence</p>
                                   <p className="font-mono text-teal-400">Alignment: {(p.provenance.meanAlignment * 100).toFixed(1)}%</p>
                                   <p className="font-mono text-teal-400">Gain: {p.provenance.meanGain.toFixed(3)}</p>
                                </div>
                                <div>
                                   <p className="text-gray-500 uppercase text-[9px] mb-1">Proposed Nudge</p>
                                   <pre className="font-mono text-gray-300 text-[10px] p-2 bg-black/40 rounded-lg overflow-x-auto">
                                      {JSON.stringify(p.nudge, null, 2)}
                                   </pre>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
                 {snapshot.proposals.length === 0 && <p className="text-center py-12 text-gray-500 uppercase tracking-widest text-sm">No significant regret detected. Performance nominal.</p>}
              </div>

              {snapshot.proposals.length > 0 && (
                <div className="sticky bottom-0 bg-black/40 pt-8 pb-4 border-t border-white/5">
                   <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="text-[10px] text-gray-500 uppercase tracking-tighter">
                         <span className="text-teal-400 font-bold">{selectedIds.size}</span> selected of {snapshot.proposals.length} total • Stable Snapshot {snapshot.id.slice(0,12)}
                      </div>
                      <button 
                        onClick={onApply}
                        disabled={isApplying || selectedIds.size === 0}
                        className="w-full md:w-auto bg-[#5EEAD4] text-black font-black px-12 py-4 rounded-3xl hover:scale-105 transition-transform disabled:opacity-50"
                      >
                        {isApplying ? "Committing..." : "Apply Calibrations"}
                      </button>
                   </div>
                </div>
              )}
           </div>
        </section>
      )}
    </main>
  );
}
