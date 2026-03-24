/**
 * **VST / Serum observer (Node)** — lives in `fxp-encoder` next to WASM.
 *
 * - **No `@alchemist/shared-engine` dependency** (avoids pnpm workspace cycles). Pass **`telemetry`** from a root script.
 * - **Igor:** `vst_observer` cell artifacts remain under `packages/shared-engine/` only.
 * - **HARD GATE:** `tools/sample_init.fxp` + green `validate-offsets-if-sample.mjs` (or `hardGateCommand`).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AICandidate } from "@alchemist/shared-types";
import { decode_fxp_fxck, encode_fxp_fxck, initSync } from "./pkg/fxp_encoder.js";

/** Structural match for `performSurgicalRepair` result (injected from CLI / shared-engine). */
export interface SurgicalRepairOutcome {
  success: boolean;
  repairedCandidate: AICandidate | null;
  repairsApplied: string[];
  note?: string;
}

export type SurgicalRepairFn = (
  candidate: AICandidate,
  options: { provenance: string; mode?: "CLAMP" | "LOG_ONLY" },
) => SurgicalRepairOutcome;

export type VstIomStance = "CONSOLIDATE" | "DISRUPT";

/** Matches `recordVstObserverSync` payload shape in shared-engine (keep aligned). */
export interface VstPulseSyncPayload {
  success: boolean;
  fxpPath: string;
  validated: boolean;
  pushedAt: string;
  schism?: string;
  provenance: string;
}

export interface VstBridgeTelemetry {
  logEvent: (event: string, payload: Record<string, unknown>) => void;
  recordVstObserverSync: (result: VstPulseSyncPayload) => void;
  setVstObserverStance: (stance: VstIomStance) => void;
}

export interface VstObserverConfig {
  serumUserPresetPath: string;
  trialFileName: string;
  watchDir: string;
  iomStance: VstIomStance;
  enforceHardGate: boolean;
  hardGateCommand?: string;
  /** When omitted, stderr JSON lines only (pulse not updated in shared-engine). */
  telemetry?: VstBridgeTelemetry;
  /**
   * After HARD GATE succeeds: run **`repair`** on **`candidate`**, then encode using repaired
   * **`paramArray`** overlaid on the init template (IOM clamp path; no shared-engine dependency here).
   */
  surgicalRepair?: {
    candidate: AICandidate;
    repair: SurgicalRepairFn;
  };
}

export interface VstSyncResult {
  success: boolean;
  fxpPath: string | null;
  validated: boolean;
  pushedAt: string | null;
  schism?: string;
  provenance: string;
  note?: string;
}

/** Optional encode path after HARD GATE (e.g. surgical-repair → `paramArray` as floats). */
export interface TriggerSyncOptions {
  /**
   * When set, these values are **overlaid** onto the decoded **`tools/sample_init.fxp`**
   * template (same length as init) so Serum param count stays aligned with validated init.
   */
  encodeParams?: Float32Array;
  /** FxCk program name (max 27 chars). */
  programName?: string;
}

/**
 * Copy init template and overwrite the first `overlay.length` floats with `overlay`.
 * Keeps Serum FxCk param count identical to the validated sample preset.
 */
export function overlayTemplateParams(template: Float32Array, overlay: Float32Array): Float32Array {
  const out = Float32Array.from(template);
  const n = Math.min(out.length, overlay.length);
  for (let i = 0; i < n; i++) {
    out[i] = overlay[i]!;
  }
  return out;
}

let wasmReady = false;

function ensureWasmLoaded(packageRoot: string): void {
  if (wasmReady) return;
  const wasmPath = join(packageRoot, "pkg", "fxp_encoder_bg.wasm");
  if (!existsSync(wasmPath)) {
    throw new Error(
      `WASM missing at ${wasmPath} — run pnpm build:wasm from repo root (packages/fxp-encoder).`,
    );
  }
  initSync(readFileSync(wasmPath));
  wasmReady = true;
}

export function expandUserPath(p: string): string {
  const t = p.trim();
  if (t.startsWith("~/")) return join(homedir(), t.slice(2));
  if (t === "~") return homedir();
  return p;
}

export function findMonorepoRootFrom(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8")) as { name?: string; workspaces?: unknown };
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        /* ignore */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function fxpEncoderPackageRoot(): string {
  return dirname(fileURLToPath(import.meta.url));
}

function stderrLog(event: string, payload: Record<string, unknown>): void {
  process.stderr.write(`${JSON.stringify({ ts: new Date().toISOString(), event, ...payload })}\n`);
}

function defaultTelemetry(): VstBridgeTelemetry {
  return {
    logEvent: (event, payload) => stderrLog(event, payload),
    recordVstObserverSync: (result) =>
      stderrLog("iom_vst_sync", { ...result, note: "stderr-only — run via scripts/vst-bridge-cli.ts for pulse" }),
    setVstObserverStance: () => {
      /* no-op without shared-engine */
    },
  };
}

function runDefaultHardGate(root: string): boolean {
  const script = join(root, "scripts", "validate-offsets-if-sample.mjs");
  const r = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  return r.status === 0;
}

function runCustomHardGate(root: string, cmd: string): boolean {
  const r = spawnSync(cmd, {
    cwd: root,
    shell: true,
    encoding: "utf8",
    env: process.env,
    timeout: 60_000,
  });
  return r.status === 0;
}

function templateParamsFromSample(samplePath: string): Float32Array {
  const data = readFileSync(samplePath);
  const decoded = decode_fxp_fxck(new Uint8Array(data)) as {
    programName?: string;
    params?: Float32Array;
  };
  const p = decoded.params;
  if (!p || !(p instanceof Float32Array) || p.length < 1) {
    throw new Error("decode_fxp_fxck: missing or empty params on sample init .fxp");
  }
  return Float32Array.from(p);
}

function toPulsePayload(r: VstSyncResult): VstPulseSyncPayload {
  return {
    success: r.success,
    fxpPath: r.fxpPath ?? "",
    validated: r.validated,
    pushedAt: r.pushedAt ?? new Date().toISOString(),
    schism: r.schism,
    provenance: r.provenance,
  };
}

export class VstObserver {
  private readonly config: VstObserverConfig;
  private readonly telemetry: VstBridgeTelemetry;

  constructor(config: VstObserverConfig) {
    const defaults = {
      trialFileName: "alchemist_trial.fxp",
      enforceHardGate: true,
      iomStance: "CONSOLIDATE" as const,
    };
    this.config = { ...defaults, ...config };
    this.telemetry = this.config.telemetry ?? defaultTelemetry();
    this.telemetry.setVstObserverStance(this.config.iomStance);
  }

  async triggerSync(provenance = "manual", options?: TriggerSyncOptions): Promise<VstSyncResult> {
    const pkgRoot = fxpEncoderPackageRoot();
    const root = findMonorepoRootFrom(pkgRoot) ?? findMonorepoRootFrom(process.cwd());

    const result: VstSyncResult = {
      success: false,
      fxpPath: null,
      validated: false,
      pushedAt: null,
      provenance,
    };

    if (!root) {
      result.schism = "MONOREPO_ROOT_NOT_FOUND";
      result.note = "Could not locate alchemist workspace root.";
      this.telemetry.logEvent("vst_observer_error", { schism: result.schism, provenance });
      this.telemetry.recordVstObserverSync(toPulsePayload(result));
      return result;
    }

    const samplePath = join(root, "tools", "sample_init.fxp");

    try {
      if (this.config.enforceHardGate) {
        if (!existsSync(samplePath)) {
          result.schism = "HARD_GATE_FAILED";
          result.note =
            "Missing tools/sample_init.fxp — add a real Serum init preset before VST push (see HARD GATE).";
          this.telemetry.logEvent("vst_observer_schism", {
            schism: result.schism,
            provenance,
            note: result.note,
          });
          this.telemetry.recordVstObserverSync(toPulsePayload(result));
          return result;
        }

        const gateOk = this.config.hardGateCommand
          ? runCustomHardGate(root, this.config.hardGateCommand)
          : runDefaultHardGate(root);

        if (!gateOk) {
          result.schism = "HARD_GATE_FAILED";
          result.note = "validate-offsets path failed (non-zero exit).";
          this.telemetry.logEvent("vst_observer_schism", {
            schism: result.schism,
            provenance,
            note: result.note,
          });
          this.telemetry.recordVstObserverSync(toPulsePayload(result));
          return result;
        }
        result.validated = true;
      }

      let overlayFromRepair: Float32Array | undefined;
      if (this.config.surgicalRepair) {
        const { candidate, repair } = this.config.surgicalRepair;
        const rr = repair(candidate, { provenance, mode: "CLAMP" });
        this.telemetry.logEvent("vst_observer_surgical_repair", {
          success: rr.success,
          repairsCount: rr.repairsApplied.length,
          repairs: rr.repairsApplied,
          provenance,
        });
        if (!rr.success || !rr.repairedCandidate) {
          result.schism = "SURGICAL_REPAIR_FAILED";
          result.note = rr.note;
          this.telemetry.logEvent("vst_observer_schism", {
            schism: result.schism,
            provenance,
            note: result.note,
          });
          this.telemetry.recordVstObserverSync(toPulsePayload(result));
          return result;
        }
        const pa = rr.repairedCandidate.paramArray;
        if (!Array.isArray(pa) || pa.length === 0) {
          result.schism = "CANDIDATE_NO_PARAM_ARRAY";
          result.note = "Repaired candidate has no paramArray for FxCk encode.";
          this.telemetry.logEvent("vst_observer_schism", {
            schism: result.schism,
            provenance,
          });
          this.telemetry.recordVstObserverSync(toPulsePayload(result));
          return result;
        }
        overlayFromRepair = new Float32Array(pa.length);
        for (let i = 0; i < pa.length; i++) {
          const v = pa[i];
          overlayFromRepair[i] = typeof v === "number" && !Number.isNaN(v) ? v : 0.5;
        }
      }

      ensureWasmLoaded(pkgRoot);
      const template = templateParamsFromSample(samplePath);
      const overlay =
        options?.encodeParams && options.encodeParams.length > 0
          ? options.encodeParams
          : overlayFromRepair;
      let params: Float32Array;
      if (overlay && overlay.length > 0) {
        params = overlayTemplateParams(template, overlay);
        this.telemetry.logEvent("vst_observer_encode_params", {
          mode: "overlay_from_candidate",
          templateLen: template.length,
          overlayLen: overlay.length,
          provenance,
        });
      } else {
        params = template;
        this.telemetry.logEvent("vst_observer_encode_params", {
          mode: "init_template_only",
          templateLen: template.length,
          provenance,
        });
      }
      const programName = (options?.programName ?? "Alchemist Trial").slice(0, 27);
      const bytes = encode_fxp_fxck(params, programName);

      const watchDir = expandUserPath(this.config.watchDir);
      mkdirSync(watchDir, { recursive: true });
      const tempName = `temp_${Date.now()}.fxp`;
      const tempPath = join(watchDir, tempName);
      writeFileSync(tempPath, Buffer.from(bytes));

      const targetDir = expandUserPath(this.config.serumUserPresetPath);
      mkdirSync(targetDir, { recursive: true });
      const targetPath = join(targetDir, this.config.trialFileName);
      writeFileSync(targetPath, readFileSync(tempPath));

      try {
        unlinkSync(tempPath);
      } catch {
        /* best-effort */
      }

      result.success = true;
      result.fxpPath = targetPath;
      result.pushedAt = new Date().toISOString();

      this.telemetry.logEvent("vst_observer_push", {
        fxpPath: targetPath,
        validated: result.validated,
        stance: this.config.iomStance,
        provenance,
        aliasEvent: "iom_vst_sync",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      result.schism = result.schism ?? "VST_PUSH_FAILED";
      result.note = message;
      this.telemetry.logEvent("vst_observer_error", { schism: result.schism, error: message, provenance });
    }

    this.telemetry.recordVstObserverSync(toPulsePayload(result));
    return result;
  }
}

/** Build config from env; **`telemetry` required** for real IOM pulse updates. */
export function vstObserverConfigFromEnv(telemetry: VstBridgeTelemetry): VstObserverConfig {
  const serum =
    process.env.SERUM_USER_PRESET_PATH?.trim() ||
    "~/Library/Audio/Presets/Xfer Records/Serum Presets/User";
  const watchDir = process.env.ALCHEMIST_FXP_WATCH_DIR?.trim() || "/tmp/alchemist_fxp";
  const stance: VstIomStance = process.env.IOM_STANCE === "DISRUPT" ? "DISRUPT" : "CONSOLIDATE";
  const trialFileName = process.env.ALCHEMIST_TRIAL_FXP_NAME?.trim() || "alchemist_trial.fxp";

  return {
    serumUserPresetPath: expandUserPath(serum),
    watchDir: expandUserPath(watchDir),
    trialFileName,
    iomStance: stance,
    enforceHardGate: true,
    telemetry,
    ...(process.env.ALCHEMIST_VST_HARD_GATE_CMD?.trim()
      ? { hardGateCommand: process.env.ALCHEMIST_VST_HARD_GATE_CMD.trim() }
      : {}),
  };
}
