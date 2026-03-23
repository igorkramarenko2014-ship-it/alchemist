"use client";

import { useTriadHealth } from "@/hooks/useTriadHealth";

export type TriadQuorumStatus = "full" | "quorum" | "degraded";

function quorumFromLiveCount(n: number): TriadQuorumStatus {
  if (n >= 3) return "full";
  if (n === 2) return "quorum";
  return "degraded";
}

export function TriadStatusBar(props: {
  loading: boolean;
  error: boolean;
  livePanelists: string[];
  /** First line from GET /api/health agent fusion when triad not 3/3. */
  agentAjiFusionCaption?: string | null;
  className?: string;
}) {
  const { loading, error, livePanelists, agentAjiFusionCaption, className = "" } = props;
  const n = livePanelists.length;
  const status = quorumFromLiveCount(n);

  const label =
    status === "full"
      ? "FULL (3/3)"
      : status === "quorum"
        ? "QUORUM (2/3)"
        : `DEGRADED (${n}/3)`;

  const emoji = status === "full" ? "🟢" : status === "quorum" ? "🟡" : "🔴";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={loading}
      className={`relative overflow-hidden rounded-xl border border-[#5EEAD4]/35 bg-gradient-to-br from-[#5EEAD4]/12 via-[#111827] to-[#0d3d36]/40 px-3 py-2 shadow-[0_0_24px_rgba(94,234,212,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 20% 0%, rgba(94,234,212,0.35), transparent 55%), radial-gradient(ellipse 100% 60% at 100% 100%, rgba(45,212,191,0.2), transparent 50%)",
        }}
      />
      <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="font-semibold tracking-wide text-[#5EEAD4] drop-shadow-[0_0_8px_rgba(94,234,212,0.35)]">
          Triad
        </span>
        {loading ? (
          <span className="text-gray-400">Checking…</span>
        ) : error ? (
          <span className="text-amber-200/90">Health unreachable</span>
        ) : (
          <>
            <span className="text-base leading-none" aria-hidden>
              {emoji}
            </span>
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-gray-100">
              {label}
            </span>
          </>
        )}
      </div>
      {!loading && !error && agentAjiFusionCaption ? (
        <p
          className="relative mt-1 max-w-[14rem] text-[10px] leading-snug text-gray-500 line-clamp-2 sm:max-w-xs"
          title={agentAjiFusionCaption}
        >
          {agentAjiFusionCaption}
        </p>
      ) : null}
    </div>
  );
}

export function TriadHealth() {
  const { loading, error, livePanelists, triadFullyLive, agentAjiChatFusion } = useTriadHealth();
  const agentAjiFusionCaption =
    !triadFullyLive && agentAjiChatFusion?.fusionLines?.[0]
      ? agentAjiChatFusion.fusionLines[0].trim()
      : null;
  return (
    <TriadStatusBar
      loading={loading}
      error={error}
      livePanelists={livePanelists}
      agentAjiFusionCaption={agentAjiFusionCaption}
    />
  );
}
