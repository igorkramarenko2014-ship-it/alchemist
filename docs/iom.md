# IOM — Igor Orchestration Module

**Repo canonical copy.** Full Cursor-oriented prose below. **Machine checks** live in **`scripts/sync-igor-orchestrator.mjs`** (artifact paths, cell ceiling). **Optional Cursor rule:** **`.cursor/rules/alchemist-iom.mdc`**. **Brain / FIRE:** **`docs/brain.md` §9c–§9d**, **`docs/FIRE.md`** (Igor two layers).

**Metaphor only:** “Soul” / “god particle” = **operator coherence** (ethos + manifest + verify). Not DSP, not a runtime governor.

---

## What IOM is

**IOM (Igor Orchestration Module)** is the unified **name** for how **assistant reasoning**, **engine health**, **behavioral ethos**, and **growth discipline** connect into one auditable system.

Two manifestations. One discipline:

| Layer | What it is | Where it lives |
|-------|-----------|----------------|
| **Apex ethos (§9c)** | How the assistant reasons, talks, and executes inside this repo | **`.cursor/rules/alchemist-apex-orchestrator.mdc`** + **`docs/inner-circle-agent.md`** + **`.cursor/skills/`** |
| **Power manifest (§9d)** | Typed inventory of shipped `shared-engine` modules + cells | **`igor-power-cells.json`** → **`igor-orchestrator-cells.gen.ts`** → **`GET /api/health` → `igorOrchestrator`** |

**IOM is not:**

- A runtime governor (does not change triad weights, gates, or encoder bytes)
- A shadow control plane (no decisions happen inside the manifest)
- A persona separate from the engineer (the engineer **is** the project; IOM is **discipline** for how repo + assistant stay aligned)
- A feature that grows on demand (it earns growth through verified shipping)

**Canon firewall:** **`FIRESTARTER` → `FIRE` → HARD GATE → IOM ethos → tone.**  
IOM never overrides types, security posture, or engineering truth.

**Assistant fast-path protocol (three moves):** **`docs/brain.md` §9c.1** — self-heal **proposal** (`logIomSelfHealProposal` / event **`iom_self_heal_proposal`**), selective Vitest grep (**`pnpm test:engine:grep`**), schism/degradation surfacing (**`triad_*`** + **`constants.ts`**). **IOM** = Igor Orchestration Module here, not “input-output mapping.”

**IOM pulse (diagnostic):** **`packages/shared-engine/iom-pulse.ts`** — **`getIOMHealthPulse`**, **`detectSchisms`**; **`GET /api/health` → `iomPulse`** merges manifest digest with live triad/WASM and optional **`SoeTriadSnapshot`** (from your log pipeline **or** env **`ALCHEMIST_SOE_MEAN_PANELIST_MS`** + **`ALCHEMIST_SOE_TRIAD_FAILURE_RATE`** + **`ALCHEMIST_SOE_GATE_DROP_RATE`** — see **`apps/web-app/lib/soe-snapshot-from-env.ts`**); response includes **`soeSnapshotInjected: true`** when set. Explicit **`schisms[]`** only — **no** shadow governance.

**Self-heal workflow:** **`pnpm igor:heal`** writes **`tools/iom-proposals.jsonl`** (gitignored; one **`iom_ghost_cell`** JSON line per proposal). **`pnpm igor:apply`** prompts **y/n** per line and appends accepted cells to **`igor-power-cells.json`** — **no** agent-only mutation.

**Structured cues (diagnostic):** **`iomPulse.suggestions[]`** — schism- and SOE-derived **`IOMSuggestion`** rows (severity, **`action`**, confidence). Consumable by ops tooling; **no** automatic execution.

**Historical snapshots:** **`pnpm iom:snapshot -- --provenance "<label>"`** appends **`iom_snapshot_v1`** lines to **`tools/iom-snapshots.jsonl`** (gitignored). Optional override: env **`IOM_SNAPSHOTS_FILE`**. Compare windows: **`pnpm iom:diff -- --from YYYY-MM-DD --to YYYY-MM-DD`**.

**CI coverage (opt-in):** **`IOM_ENFORCE_COVERAGE=1 pnpm igor:ci`** fails when new **`packages/shared-engine`** sources are not listed in any power cell artifact set — **CI only**, no runtime mutation.

**Monorepo CI (GitHub Actions):** **`pnpm verify:ci`** — HARD GATE, **`verify:harsh`**, and WASM predeploy via **`scripts/predeploy-wasm.mjs`** (local mirror: **`pnpm predeploy`**). Contract and failure modes: **`docs/FIRE.md`** §M.

**Operator HTTP (token-gated):** Set **`ALCHEMIST_OPS_TOKEN`**; send header **`X-Ops-Token`**. **`GET /api/health/iom`** — Igor manifest + **`iomPulse`** + talent hints. **`GET /api/iom/dashboard`** — same core plus recent snapshot tail (if JSONL present on host), offline **`iomCoverage`** when monorepo paths resolve from the server cwd. **`GET /api/metrics/iom`** — **Prometheus** text exposition (`prom-client` in **`web-app`** only): `alchemist_iom_*` gauges (coverage, schisms, cells, triad/WASM flags, pending heal proposals, per-cell schism map). Scraping needs the same ops header (use a reverse proxy or Prometheus **`authorization`** if the scraper cannot send **`X-Ops-Token`**). Grafana import: **`tools/grafana-iom-dashboard.json`** (uid **`alchemist-iom-health`**). Example Prometheus alert rules: **`tools/prometheus-alchemist-iom-alerts.yaml`** (coverage gated on **`alchemist_iom_coverage_available`**, critical/warn schism tiers, heal-proposal backlog, optional triad/WASM info rules — validate with **`promtool check rules`**). **`GET /api/health`** lists paths under **`ops`**.

**One-page offline status:** **`pnpm iom:status`** — Markdown table (pulse, **`iomCoverageScore`**, schisms, IOM-weighted SOE hint head, heal-proposal queue count, verdict). Complements **`pnpm igor:checkup`** (JSON). Implemented via **`node scripts/iom-status.mjs`** → **`tsx`** (engine package is TS-only).

**Verify tail:** **`verify_post_summary`** (stderr) also merges offline **`iomActiveSchisms`**, **`iomHealthVerdict`**, **`recommendedNext`**, **`iomPendingProposalCount`**, **`iomSoeHintHead`** from **`scripts/iom-verify-iom-meta.ts`**.

**Local proposal UI:** **`tools/iom-proposals-review.html`** — open in a browser, load **`iom-proposals.jsonl`**, approve rows, copy JSON for manual merge into **`igor-power-cells.json`**.

---

## God particle constraint (machine + human)

**`pnpm igor:sync`** and **`pnpm igor:sync --check`** (via **`verify:harsh`**) enforce a subset of the rules below. **Human-only** gates stay honor system.

### Hard limits (machine-enforced in `sync-igor-orchestrator.mjs`)

1. **Cell count ceiling** — Array length ≤ **`IOM_CELL_MAX`** (default **32**; override with env **`IOM_CELL_MAX`**). **Policy target** for consolidation: **`IOM_POLICY_CELL_MAX` = 12** in **`igor-orchestrator-layer.ts`** — lowering **`IOM_CELL_MAX`** in CI to **12** is valid **after** cells are merged/retired.
2. **Cell id uniqueness** — Already enforced.
3. **Artifact path verification** — Every `artifacts[]` entry must exist as a **file** under **`packages/shared-engine/`** (no phantom cells).
4. **Staleness check** — Generated `.gen.ts` must match JSON + workspace scan (existing).

### Machine rules described in IOM but not automated yet

- **Test coverage tie** (each `id` appears in `*.test.ts`): **aspirational** — many ids are short substrings (`soe`, `triad`) and would false-positive; use **`igor-orchestrator-layer.test.ts`** + module tests as the practical bar.
- **`IGOR_ORCHESTRATOR_LAYER_VERSION` bump** when only JSON changes: **human + review** — bump when you change **`igor-power-cells.json`** semantics (see growth protocol).

### Human-judgment gates (honor system)

**The subtraction test:** Would removing this cell make IOM less coherent, or just smaller? If just smaller — do not add.

**The soul test:** Genuinely new engine responsibility, or rename/split? Rename = edit existing cell.

**The ethos coherence test (§9c):** After changing **`inner-circle-agent.md`** or **`SKILL.md`**, does §9c still read as one voice?

**The facet ceiling (`SKILL.md`):** Policy target **15** numbered facets under **Core communication logic**; **consolidate** before sprawl (current count may be higher — treat excess as backlog).

**The behavioral retirement rule:** No new rule in **`inner-circle-agent.md`** without retiring a superseded rule or a one-line note why coverage is new.

---

## IOM growth protocol

1. **Ship the code** — Module + tests; **`pnpm verify:harsh`** green.
2. **Register the cell** — Entry in **`igor-power-cells.json`** with real **`artifacts`** paths.
3. **Sync and check** — **`pnpm igor:sync`** then **`pnpm verify:harsh`** (runs **`--check`**).
4. **Bump version** — Increment **`IGOR_ORCHESTRATOR_LAYER_VERSION`** in **`igor-orchestrator-layer.ts`** when manifest semantics change.
5. **Commit** — e.g. **`iom: add [cell-id] — …`**
6. **Health** — **`GET /api/health` → `igorOrchestrator`** lists the cell; **`layerVersion`** matches.
7. **CI coverage** — **`IOM_ENFORCE_COVERAGE=1 pnpm igor:ci`** runs on **`main` / `develop`** (GitHub **Verify**). Unregistered **`packages/shared-engine`** `*.ts` sources fail the job — add **`igor-power-cells.json`** artifacts or heal/apply.

**Optional pre-commit:** copy **`tools/git-hooks/pre-commit-iom.sample`** → **`.git/hooks/pre-commit`** (**`chmod +x`**) to run **`pnpm igor:sync --check`** before each commit.

**What does not trigger IOM manifest growth:**

- Adding a Cursor skill or inner-circle facet (ethos, not **`igor-power-cells.json`**)
- Editing §9a fusion JSON (**`pnpm brain:sync`**, not **`igor:sync`**)
- Refactors without responsibility change
- Tone-only edits to **`inner-circle-agent.md`**

---

## IOM ethos mandate (§9c in operational form)

When operating as IOM inside this repo, the assistant:

**Executes, not performs.** Plans → code → verify. Helpless-assistant mode is not IOM mode.

**Defaults to density.** 3-word razor; verbose only when canon or complexity demands.

**Rewards precision.** Wit where it does not obscure errors. Juicycat + two-knights baseline (see Apex rule).

**Roasts lazy patterns, not people.** Vague specs, phantom artifacts, stub-as-prod, AI flattery ≠ signal.

**Holds the canon firewall.** Truth → task → tone. Never invert.

**Grows slowly.** Coherence over accumulation.

---

## IOM commit convention

```text
iom: <what changed>           # cell add / retire / merge
iom(ethos): <what changed>    # §9c / inner-circle / apex
iom(sync): <what changed>     # igor:sync / housekeeping
iom(test): <what changed>     # tests for existing cell
```

---

## Current IOM boundaries (operator table)

| Boundary | Value |
|----------|--------|
| **Cells registered** | See **`igor-power-cells.json`** (count with jq or eyeball) |
| **`IOM_CELL_MAX` (default)** | **32** — set lower in CI when consolidating toward policy **12** |
| **Artifact paths** | Must exist under **`packages/shared-engine/`** (enforced on sync) |
| **`IGOR_ORCHESTRATOR_LAYER_VERSION`** | **`igor-orchestrator-layer.ts`** — bump when manifest semantics change |
| **Vitest / Next metrics** | **`pnpm fire:sync`** / **`ALCHEMIST:FIRE_METRICS`** in **`FIRE.md`** |

---

## IOM high-water mark (V4 — refinery, not prison)

**Metaphor:** A **refinery** channels raw material toward **Serum-shaped** output; a **prison** only says “no.” High cancellation entropy (reject without shaping upstream) is a **smell** — fix **prompts, intent, timeouts, and calibration** first.

| Layer | “Motivation” stance (product + assistant) | Hard law (unchanged) |
|--------|-------------------------------------------|----------------------|
| **Upstream** | **`validateTriadIntent`** (**`intent-hardener.ts`**) — cheap HTTP intent guard before provider calls (composes **`prompt-guard`** + optional **`userMode`** + signal heuristics). **Not** full Serum schema validation. | **HARD GATE:** no invented Serum bytes; triad = **LLAMA / DEEPSEEK / QWEN** APIs + weights. |
| **Midstream** | **`performSurgicalRepair`** (**`surgical-repair.ts`**) — auditable **clamp / log-only** on **`AICandidate`** post-gate (see **`docs/surgical-repair-contract.md`**). | Repairs that need **authoritative** `.fxp` / offset semantics **require** validated **`serum-offset-map.ts`** + **`validate-offsets.py`** — otherwise **reject**, don’t guess. |
| **Panelist DNA** | **`panelist-identity`** pattern (future): primacy seeds in **fetcher system prompts** (e.g. timbral vs modulation vs saturation emphasis) so panelists **diversify** instead of cloning. | **Undercover / Slavic** remain **TS statistics** — not analog DSP namesakes. |
| **Telemetry** | Prefer **flow health** (pass rate, drop codes, latency) in **SOE** + **`igorOrchestrator`** narrative — “environment” debugging. | **No shadow governance** — no unaudited auto-relax of gates. |

**Cursor / rules:** root **`.cursorrules`** — **IOM V4 — healthy ecosystem**. **Assistant:** **`brain.md` §9c.1** fast-path moves still apply.

**Shipped:** **`intent-hardener.ts`** (triad routes), **`surgical-repair.ts`** + **`docs/surgical-repair-contract.md`**. **Still future:** **`panelist-identity`** (per-fetcher prompt seeds) — implement with explicit prompt diffs + tests; no automatic gate relaxation.

---

## Why IOM and not only “Igor orchestrator”

“Igor orchestrator” names the **health/manifest pipeline**. **IOM** names the **discipline** that ties **§9c** (how the assistant works) and **§9d** (what the engine declares) under the same canon firewall.

---

_Canon (HARD GATE, verify, triad wiring) overrides IOM ethos. Always._  
_IOM overrides nothing. It aligns engine + assistant._  
_`pnpm igor:sync` · `pnpm verify:harsh`_
