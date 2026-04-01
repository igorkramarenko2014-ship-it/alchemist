"use client";

import { useTriadHealth } from "@/hooks/useTriadHealth";
import type { InfluenceStatus } from "@alchemist/shared-engine";

export type TriadQuorumStatus = "full" | "quorum" | "degraded";

function quorumFromLiveCount(n: number): TriadQuorumStatus {
  if (n >= 3) return "full";
  if (n === 2) return "quorum";
  return "degraded";
}

function InfoItem({
  label,
  value,
  color = "text-gray-300",
}: {
  label: string;
  value: string | React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[9px] font-bold uppercase tracking-tighter text-gray-500">
        {label}:
      </span>
      <span className={`text-[10px] font-mono leading-none ${color}`}>{value}</span>
    </div>
  );
}

export function TriadStatusBar(props: {
  loading: boolean;
  error: boolean;
  livePanelists: string[];
  /** First line from GET /api/health agent fusion when triad not 3/3. */
  agentAjiFusionCaption?: string | null;
  /** Move 1 Influence Surface payload. */
  influence?: InfluenceStatus | null;
  className?: string;
}) {
  const {
    loading,
    error,
    livePanelists,
    agentAjiFusionCaption,
    influence,
    className = "",
  } = props;
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

      {!loading && !error && influence && (
        <div className="relative mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-white/5 pt-2">
          {influence.priorsStatus && (
            <InfoItem
              label="Priors"
              value={`${influence.priorsStatus.active ? "ON" : "OFF"} (${influence.priorsStatus.confidence})`}
              color={influence.priorsStatus.active ? "text-teal-400" : "text-gray-500"}
            />
          )}
          {influence.learningStatus && (
            <InfoItem
              label="Learning"
              value={`${influence.learningStatus.status === "active" ? "Synced" : "Offline"} (${influence.learningStatus.sampleCount}s)`}
              color={influence.learningStatus.status === "active" ? "text-teal-400" : "text-gray-500"}
            />
          )}
          {influence.ajiStatus && (
            <InfoItem
              label="Aji"
              value={influence.ajiStatus.active ? "Active" : "Idle"}
              color={influence.ajiStatus.active ? "text-purple-400" : "text-gray-500"}
            />
          )}
          {influence.triadMode && (
            <InfoItem
              label="Mode"
              value={influence.triadMode.mode}
              color="text-gray-400"
            />
          )}
        </div>
      )}
    </div>
  );
}

export function TriadHealth() {
  const { loading, error, livePanelists, triadFullyLive, agentAjiChatFusion, influence } =
    useTriadHealth();
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
      influence={influence}
    />
  );
}
