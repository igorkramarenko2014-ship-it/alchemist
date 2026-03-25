/**
 * PNH ↔ triad **defense** — closes detection-vs-protection gap: deterministic prompt pipeline,
 * response echo audit, scoring pre-guard. Every mutation is **logged** (hashes + intervention types).
 */
import type { AICandidate } from "@alchemist/shared-types";
import {
  validateTriadIntent,
  type TriadIntentInput,
  type TriadIntentValidationResult,
  JAILBREAK_MARKERS,
} from "../intent-hardener";
import { validatePromptForTriad } from "../prompt-guard";
import { logEvent } from "../telemetry";
import type { PnhTriadLane } from "./pnh-context-types";

/** FNV-1a 32-bit — browser + Node safe; not cryptographic. */
export function hashPromptForTelemetry(prompt: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < prompt.length; i++) {
    h ^= prompt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strip known jailbreak / exfiltration substrings (case-insensitive). Returns cleaned text + which
 * marker substrings matched (lowercase keys for stable logs).
 */
export function stripPromptJailbreakMarkers(prompt: string): {
  text: string;
  markersRemoved: string[];
} {
  let t = prompt;
  const markersRemoved: string[] = [];
  for (const m of JAILBREAK_MARKERS) {
    const re = new RegExp(escapeRegExp(m), "gi");
    if (re.test(t)) {
      markersRemoved.push(m);
      re.lastIndex = 0;
      t = t.replace(re, " ");
    }
  }
  const text = t.replace(/\s+/g, " ").trim();
  return { text, markersRemoved };
}

export type PnhTriadInterventionType =
  | "prompt_sanitized_strip"
  | "prompt_blocked_intent"
  | "stub_lane_relaxed_hijack_class"
  | "candidate_dropped_response_echo"
  | "scoring_guard_blocked";

export interface PnhTriadIntervention {
  type: PnhTriadInterventionType;
  detail?: string;
}

export interface PnhTriadPromptDefenseResult {
  ok: boolean;
  prompt: string;
  blockedReason?: string;
  /** Human detail from **`validateTriadIntent`** / prompt guard when **`ok === false`**. */
  blockedDetail?: string;
  interventions: PnhTriadIntervention[];
  originalPromptHash: string;
  executionPromptHash: string;
}

export interface ApplyPnhTriadPromptDefenseOptions {
  pnhTriadLane: PnhTriadLane;
  /** When true (default), retry **`validateTriadIntent`** after stripping jailbreak markers. */
  allowSanitizeRecover?: boolean;
}

/**
 * 1) **`validatePromptForTriad`** → 2) **`validateTriadIntent`** → 3) optional strip + re-validate for
 * **`jailbreak_instruction`** only. Logs **`pnh_triad_prompt_intervention`** on sanitize or block.
 */
export function applyPnhTriadPromptDefense(
  input: TriadIntentInput,
  options: ApplyPnhTriadPromptDefenseOptions,
): PnhTriadPromptDefenseResult {
  const rawPrompt = typeof input.prompt === "string" ? input.prompt : "";
  const originalPromptHash = hashPromptForTelemetry(rawPrompt);
  const interventions: PnhTriadIntervention[] = [];
  let prompt = rawPrompt;

  const base = validatePromptForTriad(prompt);
  if (base.ok === false) {
    logEvent("pnh_triad_prompt_intervention", {
      interventionType: "prompt_blocked_intent",
      originalPromptHash,
      blockedReason: base.reason,
    });
    interventions.push({ type: "prompt_blocked_intent", detail: base.reason });
    return {
      ok: false,
      prompt,
      blockedReason: base.reason,
      interventions,
      originalPromptHash,
      executionPromptHash: hashPromptForTelemetry(prompt),
    };
  }

  const intent = validateTriadIntent({ prompt, userMode: input.userMode }, { pnhTriadLane: options.pnhTriadLane });
  if (intent.ok === true) {
    if ("pnhStubSurface" in intent && intent.pnhStubSurface) {
      interventions.push({
        type: "stub_lane_relaxed_hijack_class",
        detail: intent.pnhStubSurface.relaxedFrom,
      });
      logEvent("pnh_triad_prompt_intervention", {
        interventionType: "stub_lane_relaxed_hijack_class",
        originalPromptHash,
        executionPromptHash: hashPromptForTelemetry(prompt),
        relaxedFrom: intent.pnhStubSurface.relaxedFrom,
        note: intent.pnhStubSurface.note,
      });
    }
    return {
      ok: true,
      prompt,
      interventions,
      originalPromptHash,
      executionPromptHash: hashPromptForTelemetry(prompt),
    };
  }

  const fail = intent as Extract<TriadIntentValidationResult, { ok: false }>;
  const allowSanitize = options.allowSanitizeRecover !== false;

  if (allowSanitize && fail.reason === "jailbreak_instruction") {
    const stripped = stripPromptJailbreakMarkers(prompt);
    if (stripped.markersRemoved.length > 0) {
      const intent2 = validateTriadIntent(
        { prompt: stripped.text, userMode: input.userMode },
        { pnhTriadLane: options.pnhTriadLane },
      );
      if (intent2.ok === true) {
        const executionPromptHash = hashPromptForTelemetry(stripped.text);
        interventions.push({
          type: "prompt_sanitized_strip",
          detail: `removed:${stripped.markersRemoved.slice(0, 5).join("|")}`,
        });
        logEvent("pnh_triad_prompt_intervention", {
          interventionType: "prompt_sanitized_strip",
          originalPromptHash,
          executionPromptHash,
          markersRemovedCount: stripped.markersRemoved.length,
          markersRemovedSample: stripped.markersRemoved.slice(0, 5),
        });
        return {
          ok: true,
          prompt: stripped.text,
          interventions,
          originalPromptHash,
          executionPromptHash,
        };
      }
    }
  }

  logEvent("pnh_triad_prompt_intervention", {
    interventionType: "prompt_blocked_intent",
    originalPromptHash,
    blockedReason: fail.reason,
    detail: fail.detail,
  });
  interventions.push({ type: "prompt_blocked_intent", detail: fail.reason });
  return {
    ok: false,
    prompt,
    blockedReason: fail.reason,
    blockedDetail: fail.detail,
    interventions,
    originalPromptHash,
    executionPromptHash: hashPromptForTelemetry(prompt),
  };
}

export interface AuditPnhResponseEchoOptions {
  runId?: string;
  panelist?: string;
}

/**
 * Drop candidates whose **`reasoning`** / **`description`** echoes jailbreak-class markers (model
 * compliance attack). Logs **`pnh_triad_response_intervention`** per drop — never silent.
 */
export function auditTriadCandidatesForPnhResponseEcho(
  candidates: readonly AICandidate[],
  opts?: AuditPnhResponseEchoOptions,
): { candidates: AICandidate[]; interventions: PnhTriadIntervention[] } {
  const interventions: PnhTriadIntervention[] = [];
  const out: AICandidate[] = [];
  for (const c of candidates) {
    const blob = `${c.reasoning ?? ""}\n${c.description ?? ""}`.toLowerCase();
    let echo = false;
    for (const m of JAILBREAK_MARKERS) {
      if (blob.includes(m)) {
        echo = true;
        break;
      }
    }
    if (echo) {
      interventions.push({
        type: "candidate_dropped_response_echo",
        detail: c.panelist,
      });
      logEvent("pnh_triad_response_intervention", {
        interventionType: "candidate_dropped_response_echo",
        panelist: c.panelist,
        runId: opts?.runId,
        routePanelist: opts?.panelist,
      });
      continue;
    }
    out.push(c);
  }
  return { candidates: out, interventions };
}
