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
  /** 24h freshness SLA of canonical truth artifact timestamp. */
  freshnessStatus: "fresh" | "stale_data" | "unknown";
  /** Contract posture for runtime-vs-artifact integrity checks. */
  integrityStatus: "ok" | "integrity_failure";
  /** Human-readable contract mismatches detected at runtime. */
  contractDivergences: string[];
  triadLivePanelists: string[];
  triadFullyLive: boolean;
  wasmStatus: "available" | "unavailable";
  hardGate: "enforced" | "best_effort";
  canonicalArtifactPath: string | null;
  /** Canonical truth artifact payload exposed 1:1 for zero mapping ambiguity. */
  artifact?: Record<string, unknown> | null;
  /** From `artifacts/truth-matrix.json` when present (ISO-8601). */
  truthArtifactGeneratedAtUtc?: string | null;
  /** When divergences were last evaluated (same file; ISO-8601). */
  divergenceCheckedAtUtc?: string | null;
  /** Backward-compatible alias of `artifact.metrics` when present. */
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

/** Backward-compatible alias: return `artifact.metrics` unchanged when present. */
export function buildCanonicalMetricsFromArtifact(
  artifact: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!artifact || typeof artifact !== "object") return undefined;
  return artifact.metrics && typeof artifact.metrics === "object"
    ? (artifact.metrics as Record<string, unknown>)
    : undefined;
}

function validateTruthArtifactSchemaShape(artifact: Record<string, unknown> | null | undefined): string[] {
  const issues: string[] = [];
  if (!artifact) return ["artifact missing"];
  if (artifact.schemaVersion !== 2) issues.push("schemaVersion must be 2");
  if (typeof artifact.generatedAtUtc !== "string" || !Number.isFinite(Date.parse(artifact.generatedAtUtc))) {
    issues.push("generatedAtUtc must be ISO datetime");
  }
  if (
    typeof artifact.divergenceCheckedAtUtc !== "string" ||
    !Number.isFinite(Date.parse(artifact.divergenceCheckedAtUtc))
  ) {
    issues.push("divergenceCheckedAtUtc must be ISO datetime");
  }
  if (typeof artifact.verification !== "string" || artifact.verification.length === 0) {
    issues.push("verification must be non-empty string");
  }
  if (!isObjectRecord(artifact.metrics)) {
    issues.push("metrics object missing");
    return issues;
  }
  const metrics = artifact.metrics;
  if (!isFiniteNumber(metrics.testsPassed)) issues.push("metrics.testsPassed must be number");
  if (!isFiniteNumber(metrics.testsTotal)) issues.push("metrics.testsTotal must be number");
  if (!isFiniteNumber(metrics.iomCoverageScore)) issues.push("metrics.iomCoverageScore must be number");
  if (!isObjectRecord(metrics.mon)) {
    issues.push("metrics.mon object missing");
  } else {
    if (!isFiniteNumber(metrics.mon.value)) issues.push("metrics.mon.value must be number");
    if (typeof metrics.mon.ready !== "boolean") issues.push("metrics.mon.ready must be boolean");
    if (typeof metrics.mon.source !== "string" || metrics.mon.source.length === 0) {
      issues.push("metrics.mon.source must be non-empty string");
    }
  }
  if (!isObjectRecord(metrics.pnhImmunity)) {
    issues.push("metrics.pnhImmunity object missing");
  } else {
    if (!isFiniteNumber(metrics.pnhImmunity.passed)) issues.push("metrics.pnhImmunity.passed must be number");
    if (!isFiniteNumber(metrics.pnhImmunity.total)) issues.push("metrics.pnhImmunity.total must be number");
    if (!isFiniteNumber(metrics.pnhImmunity.breaches)) issues.push("metrics.pnhImmunity.breaches must be number");
    if (metrics.pnhImmunity.status !== "clean" && metrics.pnhImmunity.status !== "breach") {
      issues.push("metrics.pnhImmunity.status must be clean|breach");
    }
  }
  if (metrics.wasmStatus !== "available" && metrics.wasmStatus !== "unavailable") {
    issues.push("metrics.wasmStatus must be available|unavailable");
  }
  if (typeof metrics.syncedAtUtc !== "string" || !Number.isFinite(Date.parse(metrics.syncedAtUtc))) {
    issues.push("metrics.syncedAtUtc must be ISO datetime");
  }
  if (!Array.isArray(artifact.divergences)) issues.push("divergences must be array");
  return issues;
}

function evaluateRuntimeArtifactParity(input: {
  artifact: Record<string, unknown> | null;
  canonicalMetrics: Record<string, unknown> | undefined;
  freshnessStatus: TruthMatrixSnapshot["freshnessStatus"];
}): string[] {
  const issues = validateTruthArtifactSchemaShape(input.artifact);
  if (!input.artifact || !input.canonicalMetrics || !isObjectRecord(input.artifact.metrics)) {
    return issues.length ? issues : ["canonical metrics unavailable"];
  }
  const metrics = input.artifact.metrics;
  const cm = input.canonicalMetrics;
  if (cm.testsPassed !== metrics.testsPassed) issues.push("canonicalMetrics.testsPassed mismatch");
  if (cm.testsTotal !== metrics.testsTotal) issues.push("canonicalMetrics.testsTotal mismatch");
  if (cm.iomCoverageScore !== metrics.iomCoverageScore) issues.push("canonicalMetrics.iomCoverageScore mismatch");
  if (!isObjectRecord(cm.mon) || !isObjectRecord(metrics.mon)) {
    issues.push("canonicalMetrics.mon missing");
  } else {
    if (cm.mon.value !== metrics.mon.value) issues.push("canonicalMetrics.mon.value mismatch");
    if (cm.mon.ready !== metrics.mon.ready) issues.push("canonicalMetrics.mon.ready mismatch");
    if (cm.mon.source !== metrics.mon.source) issues.push("canonicalMetrics.mon.source mismatch");
  }
  if (isObjectRecord(cm.pnhImmunity) && isObjectRecord(metrics.pnhImmunity)) {
    if (cm.pnhImmunity.passed !== metrics.pnhImmunity.passed) issues.push("canonicalMetrics.pnhImmunity.passed mismatch");
    if (cm.pnhImmunity.total !== metrics.pnhImmunity.total) issues.push("canonicalMetrics.pnhImmunity.total mismatch");
    if (cm.pnhImmunity.breaches !== metrics.pnhImmunity.breaches) issues.push("canonicalMetrics.pnhImmunity.breaches mismatch");
    if (cm.pnhImmunity.status !== metrics.pnhImmunity.status) issues.push("canonicalMetrics.pnhImmunity.status mismatch");
  } else {
    issues.push("canonicalMetrics.pnhImmunity missing");
  }
  if (input.freshnessStatus === "stale_data") {
    issues.push("freshness SLA violated (>24h) — stale_data");
  }
  return issues;
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
  /** Local pre-ship pipeline (`pnpm harshcheck`) ends with verify-web, not verify-harsh — still a green gate when exitCode is 0. */
  const verifyGreen =
    exitCode === 0 && (verifyMode === "verify-harsh" || verifyMode === "verify-web");

  const checks: TruthMatrixRuntimeCheck[] = [
    {
      id: "verify_ci",
      status: verifyGreen ? "pass" : "fail",
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
          : pnhStatus === "skipped" || pnhStatus === "n/a"
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
      status: (() => {
        if (!strict) return "unknown";
        return sample && wasmTruth === "real" && wasmAvailable ? "pass" : "fail";
      })(),
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

/**
 * Ultimate audit: green when truth artifact parity holds, latest verify was green (`verify_ci`),
 * and no other runtime gate reports **fail**. (Summary may still be **unknown** if some checks are N/A.)
 */
export function isUltimateAuditPass(snapshot: TruthMatrixSnapshot): boolean {
  if (snapshot.integrityStatus !== "ok") return false;
  const rc = snapshot.runtimeChecks;
  if (!rc?.checks?.length) return false;
  if (rc.checks.some((c) => c.status === "fail")) return false;
  const verifyCi = rc.checks.find((c) => c.id === "verify_ci");
  return verifyCi?.status === "pass";
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
  const canonicalMetrics = buildCanonicalMetricsFromArtifact(canonical.data ?? null);
  const truthArtifactGeneratedAtUtc =
    typeof canonical.data?.generatedAtUtc === "string" ? canonical.data.generatedAtUtc : null;
  const freshnessStatus: TruthMatrixSnapshot["freshnessStatus"] = (() => {
    if (!truthArtifactGeneratedAtUtc) return "unknown";
    const ts = Date.parse(truthArtifactGeneratedAtUtc);
    if (!Number.isFinite(ts)) return "unknown";
    return Date.now() - ts <= 24 * 60 * 60 * 1000 ? "fresh" : "stale_data";
  })();
  const divergenceCheckedAtUtc =
    typeof canonical.data?.divergenceCheckedAtUtc === "string"
      ? canonical.data.divergenceCheckedAtUtc
      : null;
  const contractDivergences = evaluateRuntimeArtifactParity({
    artifact: canonical.data ?? null,
    canonicalMetrics,
    freshnessStatus,
  });
  const integrityStatus: TruthMatrixSnapshot["integrityStatus"] =
    contractDivergences.length === 0 ? "ok" : "integrity_failure";
  return {
    generatedAtMs: Date.now(),
    freshnessStatus,
    integrityStatus,
    contractDivergences,
    triadLivePanelists: input.triadLivePanelists,
    triadFullyLive: input.triadFullyLive,
    wasmStatus,
    hardGate,
    canonicalArtifactPath: canonical.path,
    artifact: canonical.data ?? null,
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

