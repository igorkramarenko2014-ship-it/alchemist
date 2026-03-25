# Brain+ — minimal outside assessment (self-synced)

**Purpose:** One short file for **external reviewers** (mentors, auditors, another team’s architect) and for **LLMs** that need **only** essentials + fresh **verify signals**. Narrative depth → **`brain.md`**; law + contracts → **`FIRE.md`** / **`FIRESTARTER.md`**.

**Self-optimisation:** The table between **`ALCHEMIST:BRAIN_PLUS_METRICS`** is refreshed by **`pnpm fire:sync`** (same run as **`docs/FIRE.md`** — green **`shared-engine` Vitest** required). **Do not hand-edit** inside those markers.

**Human-maintained:** Edit **`§ Human deltas`** below when the product or risk posture changes (target: every material release).

---

## Product essence (≤30 s)

| Field | Content |
|-------|---------|
| **One-liner** | NL prompt → **AI triad** → **TS gates** → ranked **Serum preset candidates**; optional **browser `.fxp`** via Rust→WASM when built. |
| **Primary user** | Producers using **Xfer Serum** who want fast, gated preset ideation from text/voice. |
| **Core repo** | `apps/web-app` + `packages/shared-engine` + `packages/shared-types` + `packages/fxp-encoder`. |

---

## Machine snapshot (synced)

<!-- ALCHEMIST:BRAIN_PLUS_METRICS:BEGIN -->

_Machine block — do not edit by hand; run `pnpm fire:sync`._

| Signal | Value |
|--------|-------|
| **Synced (UTC)** | **2026-03-25** |
| **Vitest** (`@alchemist/shared-engine`) | **263** tests passed, **48** files (runner) · **48** `*.test.ts` on disk |
| **Next.js** (`apps/web-app`) | **14.2.35** (`dependencies.next`) |
| **Canonical metrics JSON** | `docs/fire-metrics.json` — verify: `sha256sum -c docs/fire-metrics.sha256` (repo root) |

**Commands:** `pnpm fire:sync` · optional `ALCHEMIST_FIRE_SYNC=1` on `pnpm harshcheck` / `pnpm verify:harsh` to refresh after a green run.

<!-- ALCHEMIST:BRAIN_PLUS_METRICS:END -->

---

## HARD GATE (non-negotiable)

Authoritative **Serum / `.fxp`** work requires validated **`serum-offset-map.ts`** + **`tools/validate-offsets.py`** on a **real** init **`.fxp`**. No invented offsets.

---

## Verify (what “green” means here)

- **`pnpm verify:ci`** — **`pnpm assert:hard-gate`** + **`pnpm verify:harsh`** + **`IOM_ENFORCE_COVERAGE=1 pnpm igor:ci`** (GitHub **`Verify`** workflow; sample **`.fxp`** optional unless **`ALCHEMIST_STRICT_OFFSETS=1`**).
- **`pnpm harshcheck:wasm`** / **`pnpm verify:harsh:wasm`** — same verify chain + **`REQUIRE_WASM=1 assert:wasm`** (real **`fxp-encoder/pkg/`**; run **`pnpm build:wasm`** first).
- **`pnpm verify:harsh`** — types + **`shared-engine`** Vitest (no production Next build).
- **`pnpm harshcheck`** — above + **`next build`**; ends with stderr **`verify_post_summary`**.
- **Browser export** additionally needs WASM build + **`GET /api/health/wasm`** → **`available`**; deploy helper **`pnpm predeploy`** runs **`build:wasm`** then strict **`assert:wasm`**.

---

## Stack (at a glance)

- **Frontend:** Next.js 14 App Router, Tailwind, React.
- **Core logic:** TypeScript in **`packages/shared-engine`** (triad orchestration, gates, telemetry, optional **Igor manifest** — **`pnpm igor:sync`**, **`GET /api/health` → `igorOrchestrator`**; **IOM pulse** — **`iom-pulse.ts`**, **`GET /api/health` → `iomPulse`** with explicit **`schisms[]`**; map + diagnostics only, not gate law).
- **Encoder:** **`packages/fxp-encoder`** (Rust optional for dev; WASM for browser export).

---

## Boundaries (avoid wrong advice)

- **Undercover / Slavic / triad governance** = **TypeScript** preset QA and telemetry — **not** analog saturation/resonance DSP in the plugin sense.
- **SOE** = hints from aggregate metrics — **not** oversampling engine switching.

---

## Agent thinking (optional tone layer)

**Not a contract.** Long-horizon **trusted-peer** patterns are merged into assistant **reasoning order** via **`docs/brain.md` §14** and **`.cursor/skills/inner-circle-voice/SKILL.md`** (`reference.md` is a stub—no chat provenance in git). **Canon first** (HARD GATE, verify, gate facts); **tone second** when the user wants peer-style collaboration—**never** as a substitute for engineering truth.

---

## § Human deltas (edit manually)

_Update this block when outsiders need new context._

| Field | Value (you edit) |
|-------|-------------------|
| **Top risk today** | WASM stub vs real **`pkg/`** (use **`harshcheck:wasm`** before browser export); triad stub vs fetcher parity; HARD GATE sample **`.fxp`** local/CI-secret; taxonomy pools **>200** still need **`rankTaxonomy`** or **`oversizeKeywordFallback`** — not silent by default. |
| **What we want from reviewers** | **`igor:ci`** in CI (ghost **`shared-engine`** files); optional **`ALCHEMIST_SOE_*`** env on **`GET /api/health`** for **`iomPulse` + SOE** schisms; Panelist **DNA** lines in **`triad-panelist-system-prompt.ts`**. |
| **Last manual refresh (date)** | **2026-03-25** — preset share (`/presets/[slug]`, **`preset_share`** IOM cell, **`preset_shared`** telemetry); metrics via **`pnpm fire:sync`** |
| **Release / branch under review** | _e.g. main @ abc1234_ |

---

## Improvement prompts (for outsiders)

Paste to an auditor or LLM:

1. “Given **HARD GATE**, where could we **accidentally** ship non-validated bytes?”
2. “Where do **stub** triad / missing keys **diverge** from production behavior?”
3. “List **single points of failure** in prompt → triad → gates → export.”
4. “What **tests** are missing for **Slavic + Undercover** edge cases?”
5. “Is **`verify_post_summary`** sufficient for your SIEM / audit trail needs?”

---

## Maintenance protocol

| Action | When |
|--------|------|
| **`pnpm fire:sync`** | After green **`verify:harsh`** or **`harshcheck`** (refreshes this file’s metrics + **`FIRE.md`**) |
| **`pnpm iom:status`** | One-shot **Markdown** table: offline **`getIOMHealthPulse`**, **`iomCoverageScore`**, schisms, SOE hint (IOM-weighted), **`tools/iom-proposals.jsonl`** queue count + verdict line |
| **`pnpm igor:checkup`** | Optional one-shot **JSON**: offline **`iomPulse`** + **`iomCoverage`**; set **`ALCHEMIST_CHECKUP_BASE_URL`** to append **`/api/health`** triad slice |
| **`pnpm igor:sync`** | After adding/removing workspace **`apps/*` / `packages/*`**, or editing **`igor-orchestrator-meta.json`** / **`igor-power-cells.json`** — then commit **`.gen.ts`**; **`verify:harsh`** checks staleness |
| Edit **§ Human deltas** | Each release or before external review |
| Deep doc changes | **`FIRESTARTER.md`** + contract rows **`FIRE.md` §E–L** |
