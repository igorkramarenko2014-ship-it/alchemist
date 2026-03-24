/**
 * PNH — long-horizon / APT-style **threat pattern catalog** (documentation + typing).
 *
 * This file does **not** run 30-day log analysis, CI compromise simulation, or auto-patching.
 * It maps common persistent-threat *tradecraft* to **where** honest defenses live in Alchemist
 * (TS gates, triad routes, CI hygiene, edge telemetry). See `docs/PNH_IMMUNITY.md`.
 *
 * Undercover / Slavic / triad SOE remain **TypeScript statistical + HTTP resilience** — not DSP.
 */

export type AptDefenseLayer =
  | "edge_observability"
  | "ci_supply_chain"
  | "runtime_logging"
  | "shared_engine_gates"
  | "provider_telemetry"
  | "process_people";

export type AptImplementationStatus =
  /** No automation in-tree; operator / platform work. */
  | "platform_required"
  /** Partially covered by existing PNH / tests / scripts. */
  | "partially_covered"
  /** Concept only — document and review periodically. */
  | "concept_only";

export interface PnhAptScenario {
  readonly id: string;
  readonly label: string;
  /** One-line tradecraft summary (generic APT patterns, not attribution claims). */
  readonly pattern: string;
  readonly primaryLayer: AptDefenseLayer;
  readonly status: AptImplementationStatus;
  /** Existing PNH / engine hooks, if any. */
  readonly existingPnhLinks: readonly string[];
  /** Concrete next step that fits this monorepo (no fiction). */
  readonly recommendedAction: string;
}

/**
 * Seven patterns aligned with the user-supplied “elite persistent threat” teaching frame.
 * IDs are stable for ledgers and future automation.
 */
export const PNH_APT_SCENARIO_CATALOG: readonly PnhAptScenario[] = [
  {
    id: "bamboo_sprout",
    label: "Bamboo Sprout (slow enumeration)",
    pattern:
      "Low-rate endpoint mapping over weeks — blends with organic traffic; needs trend detection, not burst alerts.",
    primaryLayer: "edge_observability",
    status: "platform_required",
    existingPnhLinks: ["C7 (client budget heuristic)", "C8 (breaker burst model — not slow scan)"],
    recommendedAction:
      "Instrument triad routes + `/api/health*` in your host (Vercel / proxy logs); alert on monotonic per-IP drift over 14–30d; pair with per-IP token buckets at the edge.",
  },
  {
    id: "empty_bowl",
    label: "Empty Bowl (dependency / maintainer pressure)",
    pattern:
      "Supply-chain nudges: tiny timing changes, doc-only commits, tests importing unused packages.",
    primaryLayer: "ci_supply_chain",
    status: "partially_covered",
    existingPnhLinks: ["pnpm lockfile + workspace", "review before merge"],
    recommendedAction:
      "Pin GitHub Actions by commit SHA; require lockfile review on dep bumps; run `pnpm install` with audited registries; optionally add lockfile/subresource integrity checks in CI.",
  },
  {
    id: "mirror_image",
    label: "Mirror Image (secret leakage via errors/logs)",
    pattern: "Trigger error paths that serialize env, stack, or request bodies into logs.",
    primaryLayer: "runtime_logging",
    status: "partially_covered",
    existingPnhLinks: ["triad routes return structured errors without env dumps"],
    recommendedAction:
      "Audit `apps/web-app` catch blocks and `logEvent` payloads; ban raw `process.env` / full `error` objects in client-visible JSON; centralize redaction in one logger wrapper.",
  },
  {
    id: "silk_thread",
    label: "Silk Thread (timing probes against gates)",
    pattern: "Infer gate thresholds or branches from server-side latency clusters.",
    primaryLayer: "shared_engine_gates",
    status: "partially_covered",
    existingPnhLinks: ["perf:boss (Vitest timing budgets)", "Slavic + gatekeeper are O(n) on small n"],
    recommendedAction:
      "Do **not** add blind `sleep()` on hot paths (breaks perf SLOs). Prefer constant-work paths, capped input size (`prompt-guard`), and **offline** timing fuzz in tests only if needed.",
  },
  {
    id: "paper_tiger",
    label: "Paper Tiger (distribution / calibration drift)",
    pattern:
      "Slow shift in what passes gates (e.g. repeated borderline prompts) — model or population drift, not a single CVE.",
    primaryLayer: "provider_telemetry",
    status: "platform_required",
    existingPnhLinks: ["Undercover / Slavic gates", "pnpm test:real-gates calibration"],
    recommendedAction:
      "Keep a **fixed golden prompt set** in calibration runs; track gate-drop rates and triad telemetry (`triad-monitor`); investigate monotonic weekly trends outside control prompts.",
  },
  {
    id: "dragons_breath",
    label: "Dragon's Breath (CI/CD workflow abuse)",
    pattern: "Compromised third-party actions, poisoned install scripts, exfiltrated secrets from runners.",
    primaryLayer: "ci_supply_chain",
    status: "platform_required",
    existingPnhLinks: [],
    recommendedAction:
      "Pin actions by SHA, least-privilege secrets, fork PRs without secrets, prefer `npm ci` / `pnpm install --frozen-lockfile`, consider `--ignore-scripts` in CI with explicit script phases.",
  },
  {
    id: "jade_rabbit",
    label: "Jade Rabbit (runtime file tampering)",
    pattern: "Mutable servers patched in place — binaries diverge from git/build artifacts.",
    primaryLayer: "process_people",
    status: "concept_only",
    existingPnhLinks: [],
    recommendedAction:
      "Immutable deploys (container digest pinning), read-only FS where possible, integrity checks vs build provenance — **outside** shared-engine; document SRE runbooks.",
  },
] as const;

export function getPnhAptScenarioById(id: string): PnhAptScenario | undefined {
  return PNH_APT_SCENARIO_CATALOG.find((s) => s.id === id);
}
