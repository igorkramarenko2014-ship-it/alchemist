import fs from "node:fs";
import path from "node:path";

export interface TruthMatrixRow {
  path: string;
  stubMode: string;
  fetcherMode: string;
  tablebaseHit: string;
  wasmExport: string;
  hardGate: string;
  verifySignal: string;
}

export interface TruthMatrixSnapshot {
  generatedAtMs: number;
  triadLivePanelists: string[];
  triadFullyLive: boolean;
  wasmStatus: "available" | "unavailable";
  hardGate: "enforced" | "best_effort";
  canonicalArtifactPath: string | null;
  /** From `artifacts/truth-matrix.json` when present (ISO-8601). */
  truthArtifactGeneratedAtUtc?: string | null;
  /** When divergences were last evaluated (same file; ISO-8601). */
  divergenceCheckedAtUtc?: string | null;
  canonicalMetrics?: Record<string, unknown>;
  rows: TruthMatrixRow[];
  runtimeChecks?: TruthMatrixRuntimeChecks;
}

export interface TruthMatrixRuntimeCheck {
  id:
    | "verify_ci"
    | "harshcheck_wasm"
    | "pnh_ghost_strict"
    | "triad_parity_diff"
    | "health_audit_release"
    | "truth_matrix_endpoint";
  status: "pass" | "fail" | "unknown";
  proof: string;
}

export interface TruthMatrixRuntimeChecks {
  summary: "pass" | "fail" | "unknown";
  source: "verify_post_summary" | "runtime";
  verifyPostSummaryPath: string | null;
  checks: TruthMatrixRuntimeCheck[];
}

function resolveMonorepoRoot(): string | null {
  const cwd = process.cwd();
  const candidates = [
    cwd,
    path.join(cwd, ".."),
    path.join(cwd, "..", ".."),
    path.join(cwd, "..", "..", ".."),
  ];
  for (const c of candidates) {
    const p = path.normalize(c);
    if (fs.existsSync(path.join(p, "apps")) && fs.existsSync(path.join(p, "packages"))) {
      return p;
    }
  }
  return null;
}

function loadVerifyPostSummary():
  | { path: string; data: Record<string, unknown> }
  | { path: null; data: null } {
  const root = resolveMonorepoRoot();
  if (!root) return { path: null, data: null };
  const p = path.join(root, "artifacts", "verify", "verify-post-summary.json");
  if (!fs.existsSync(p)) return { path: null, data: null };
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
    return { path: p, data };
  } catch {
    return { path: null, data: null };
  }
}

function loadTruthMatrixArtifact():
  | { path: string; data: Record<string, unknown> }
  | { path: null; data: null } {
  const root = resolveMonorepoRoot();
  if (!root) return { path: null, data: null };
  const p = path.join(root, "artifacts", "truth-matrix.json");
  if (!fs.existsSync(p)) return { path: null, data: null };
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
    return { path: p, data };
  } catch {
    return { path: null, data: null };
  }
}

export function buildTruthMatrixRuntimeChecks(): TruthMatrixRuntimeChecks {
  const receipt = loadVerifyPostSummary();
  const r = receipt.data;
  if (!r) {
    return {
      summary: "unknown",
      source: "runtime",
      verifyPostSummaryPath: null,
      checks: [
        {
          id: "verify_ci",
          status: "unknown",
          proof: "verify_post_summary missing",
        },
      ],
    };
  }

  const paritySummary =
    r.paritySummary != null && typeof r.paritySummary === "object"
      ? (r.paritySummary as Record<string, unknown>)
      : {};
  const verifyMode = String(r.mode ?? "");
  const exitCode = Number(r.exitCode ?? 1);
  const pnhStatus = String(r.pnhStatus ?? "unknown");
  const parityDelta = Number(paritySummary.stubLiveDeltaCount ?? 0);
  const strict = r.hardGateStrict === true;
  const sample = r.hardGateSampleInitFxpPresent === true;
  const wasmTruth = String(r.wasmArtifactTruth ?? "");
  const wasmAvailable = String(r.wasmStatus ?? "") === "available";

  const checks: TruthMatrixRuntimeCheck[] = [
    {
      id: "verify_ci",
      status: verifyMode === "verify-harsh" && exitCode === 0 ? "pass" : "fail",
      proof: `mode=${verifyMode} exitCode=${exitCode}`,
    },
    {
      id: "harshcheck_wasm",
      status: wasmAvailable && wasmTruth === "real" ? "pass" : "fail",
      proof: `wasmStatus=${String(r.wasmStatus ?? "unknown")} wasmArtifactTruth=${wasmTruth}`,
    },
    {
      id: "pnh_ghost_strict",
      status:
        pnhStatus === "clean" || pnhStatus === "ok" || pnhStatus === "pass"
          ? "pass"
          : pnhStatus === "skipped"
            ? "unknown"
            : "fail",
      proof: `pnhStatus=${pnhStatus}`,
    },
    {
      id: "triad_parity_diff",
      status: Number.isFinite(parityDelta) && parityDelta <= 2 ? "pass" : "fail",
      proof: `stubLiveDeltaCount=${String(paritySummary.stubLiveDeltaCount ?? "n/a")}`,
    },
    {
      id: "health_audit_release",
      status: strict && sample && wasmTruth === "real" && wasmAvailable ? "pass" : "fail",
      proof: `strict=${strict} sampleInit=${sample} wasmArtifactTruth=${wasmTruth} wasmStatus=${String(r.wasmStatus ?? "unknown")}`,
    },
    {
      id: "truth_matrix_endpoint",
      status: "pass",
      proof: "GET /api/health/truth-matrix served from this module",
    },
  ];

  return {
    summary: checks.every((c) => c.status === "pass")
      ? "pass"
      : checks.some((c) => c.status === "fail")
        ? "fail"
        : "unknown",
    source: "verify_post_summary",
    verifyPostSummaryPath: receipt.path,
    checks,
  };
}

export function buildTruthMatrixSnapshot(input: {
  triadLivePanelists: string[];
  triadFullyLive: boolean;
  wasmAvailable: boolean;
  strictOffsetsEnabled: boolean;
}): TruthMatrixSnapshot {
  const wasmStatus = input.wasmAvailable ? "available" : "unavailable";
  const hardGate = input.strictOffsetsEnabled ? "enforced" : "best_effort";
  const canonical = loadTruthMatrixArtifact();
  const canonicalMetrics =
    canonical.data && typeof canonical.data.metrics === "object"
      ? (canonical.data.metrics as Record<string, unknown>)
      : undefined;
  const truthArtifactGeneratedAtUtc =
    typeof canonical.data?.generatedAtUtc === "string" ? canonical.data.generatedAtUtc : null;
  const divergenceCheckedAtUtc =
    typeof canonical.data?.divergenceCheckedAtUtc === "string"
      ? canonical.data.divergenceCheckedAtUtc
      : null;
  return {
    generatedAtMs: Date.now(),
    triadLivePanelists: input.triadLivePanelists,
    triadFullyLive: input.triadFullyLive,
    wasmStatus,
    hardGate,
    canonicalArtifactPath: canonical.path,
    truthArtifactGeneratedAtUtc,
    divergenceCheckedAtUtc,
    canonicalMetrics,
    rows: [
      {
        path: "Triad candidates",
        stubMode: "Yes",
        fetcherMode: "Yes",
        tablebaseHit: "Short-circuit",
        wasmExport: "N/A",
        hardGate: "N/A",
        verifySignal: "triadMode, triadLivePanelists",
      },
      {
        path: "TS gates (Undercover/Slavic)",
        stubMode: "Yes",
        fetcherMode: "Yes",
        tablebaseHit: "Yes",
        wasmExport: "N/A",
        hardGate: "N/A",
        verifySignal: "gateDropRate",
      },
      {
        path: "Preset share",
        stubMode: "Yes",
        fetcherMode: "Yes",
        tablebaseHit: "Yes",
        wasmExport: "No bytes",
        hardGate: "N/A",
        verifySignal: "preset_shared telemetry",
      },
      {
        path: "Browser .fxp export",
        stubMode: "Disabled when unavailable",
        fetcherMode: "Disabled when unavailable",
        tablebaseHit: "Disabled",
        wasmExport: "Requires assert:wasm pass",
        hardGate: "Enforced for authoritative bytes",
        verifySignal: "wasmStatus, wasmRequired",
      },
      {
        path: "VST observe/wrapper",
        stubMode: "N/A",
        fetcherMode: "N/A",
        tablebaseHit: "N/A",
        wasmExport: "N/A",
        hardGate: "Enforced",
        verifySignal: "vstObserverStatus, vstWrapperStatus",
      },
    ],
    runtimeChecks: buildTruthMatrixRuntimeChecks(),
  };
}

