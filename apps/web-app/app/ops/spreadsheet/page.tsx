"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MercuryBall } from "@/components/ui/MercuryBall";
import { env } from "@/env";

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1oObKSrVwLX_7Ut4Z6g3fZW-AX1j1-k6w-cDsrkaSbHM/edit#gid=0";

export default function SpreadsheetAgentPage() {
  const [token, setToken] = useState<string>("");
  const [authorized, setAuthorized] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authorize = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ops/spreadsheet", {
        headers: { "x-ops-token": token },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setAuthorized(true);
        setError(null);
      } else {
        setError("Unauthorized or Agent Disabled");
      }
    } catch (e) {
      setError("Connection failure");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/ops/spreadsheet", {
        method: "POST",
        headers: { 
            "x-ops-token": token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setError(null);
      } else {
        setError("Save failed");
      }
    } catch (e) {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updateVector = (key: string, field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      vectors: {
        ...prev.vectors,
        [key]: {
          ...prev.vectors[key],
          [field]: value
        }
      }
    }));
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 selection:bg-teal-400/30">
        <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-50" />
          <h1 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Spreadsheet Agent</h1>
          <p className="text-teal-400/60 text-[10px] font-bold uppercase tracking-[0.3em] mb-8">Human Calibration Access</p>
          
          <input
            type="password"
            placeholder="X-Ops-Token"
            className="w-full bg-black/40 border border-teal-400/20 rounded-2xl px-5 py-4 text-teal-400 placeholder-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-400/20 mb-6 transition-all"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && authorize()}
          />
          
          <button 
            onClick={authorize}
            className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-teal-400 transition-colors uppercase tracking-widest text-xs"
          >
            {loading ? "Syncing Logic..." : "Open Spreadsheet"}
          </button>
          
          {error && <p className="mt-6 text-red-400 text-[10px] text-center uppercase font-bold tracking-tighter animate-pulse">{error}</p>}
          
          <div className="mt-10 pt-10 border-t border-white/5 flex flex-col gap-4">
             <p className="text-gray-600 text-[9px] uppercase tracking-widest text-center">Remote XL Link for Svitlana</p>
             <a 
              href={GOOGLE_SHEET_URL}
              target="_blank"
              className="text-teal-400/40 hover:text-teal-400 text-[10px] text-center font-mono transition-colors break-all"
             >
                {GOOGLE_SHEET_URL}
             </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-gray-100 p-4 md:p-12 font-sans selection:bg-teal-400/30">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-16 relative">
        <div className="z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-4 h-4 rounded-full bg-teal-400 animate-pulse shadow-[0_0_20px_rgba(94,234,212,0.5)]" />
            <h1 className="text-5xl font-black tracking-tighter uppercase">Calibration <span className="text-teal-400 font-thin italic">XL</span></h1>
          </div>
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] font-bold">ALCHEMIST SPREADSHEET AGENT • MOVE 5.1</p>
        </div>

        <div className="flex items-center gap-6">
           <div className="text-right hidden md:block">
              <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Operator Role</p>
              <p className="text-sm font-mono text-teal-400">Digital Igor / Svitlana</p>
           </div>
           <div className="w-24 h-24 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-teal-400/10 blur-[40px] rounded-full" />
              <MercuryBall vividness={0.9} />
           </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto space-y-12">
        {/* Human Calibration Matrix */}
        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 md:p-12 backdrop-blur-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/5 blur-[100px] rounded-full -mr-32 -mt-32" />
           
           <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-2xl font-bold tracking-tighter text-white mb-1 uppercase">Human Trinity Matrix</h2>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Calibration Vectors for Svitlana, Anton, and Elisey</p>
              </div>
              <button 
                onClick={save}
                disabled={saving}
                className="bg-teal-400 text-black font-black px-10 py-3 rounded-full text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? "Writing Seeds..." : "Sync to Index"}
              </button>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                 <thead>
                    <tr className="border-b border-white/10">
                       <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">Archetype</th>
                       <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">Operator</th>
                       <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">Focus</th>
                       <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">Coefficient</th>
                       <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 tracking-widest opacity-0">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {data && Object.entries(data.vectors).map(([key, v]: any) => (
                      <tr key={key} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-6 px-6 font-mono text-xs text-teal-400">{v.archetype}</td>
                        <td className="py-6 px-6">
                           <input 
                            value={v.name}
                            onChange={(e) => updateVector(key, "name", e.target.value)}
                            className="bg-transparent border-none text-white font-bold focus:outline-none focus:text-teal-400 transition-colors"
                           />
                        </td>
                        <td className="py-6 px-6 text-xs text-gray-400 uppercase tracking-widest">
                           <input 
                            value={v.focus}
                            onChange={(e) => updateVector(key, "focus", e.target.value)}
                            className="bg-transparent border-none focus:outline-none focus:text-teal-400 transition-colors"
                           />
                        </td>
                        <td className="py-6 px-6">
                           <div className="flex items-center gap-4">
                              <span className="font-mono text-xs text-gray-100">{((v.harmony || v.rhythm || v.texture) * 117).toFixed(1)}</span>
                              <div className="flex-1 min-w-[120px] h-1 bg-white/5 rounded-full overflow-hidden">
                                 <div 
                                  className="h-full bg-teal-400" 
                                  style={{ width: `${(v.harmony || v.rhythm || v.texture) * 100}%` }}
                                 />
                              </div>
                           </div>
                        </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        {/* External Resources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 hover:border-teal-400/30 transition-colors group cursor-pointer" onClick={() => window.open(GOOGLE_SHEET_URL, "_blank")}>
               <h3 className="text-xs font-black uppercase tracking-widest text-[#5EEAD4] mb-4">Direct XL Bridge</h3>
               <p className="text-sm text-gray-400 leading-relaxed mb-6">Open the Google Sheets calibration master for high-bulk operations and formula-based truth generation.</p>
               <span className="text-[10px] font-mono text-teal-400 opacity-40 group-hover:opacity-100 transition-opacity uppercase">Launch external spreadsheet agent →</span>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 flex flex-col justify-between">
               <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Situational Awareness</h3>
                  <p className="text-sm text-gray-500 italic">"The human vector must remain anchored in the trinity of Athena, Hermes, and Hestia to prevent machine drift."</p>
               </div>
               <div className="mt-8 flex items-center justify-between">
                  <span className="text-[9px] text-teal-400/40 uppercase font-mono tracking-tighter">Last Trinity Sync: {data?.lastSync ? new Date(data.lastSync).toLocaleTimeString() : "Pending"}</span>
                  <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(94,234,212,0.8)]" />
               </div>
            </div>
        </div>
      </section>

      <footer className="mt-24 pt-12 border-t border-white/5 text-center">
         <p className="text-[9px] text-gray-600 uppercase tracking-[0.4em]">Proprietary Calibration Agent • Alchemist Research</p>
      </footer>
    </main>
  );
}
