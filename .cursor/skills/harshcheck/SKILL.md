---
name: harshcheck
description: >-
  Alchemist harshcheck protocol: run pnpm verify:harsh before UI suggestions; verify:harsh,
  harshcheck, offset gate, doctor. Use for /harshcheck, harshchek (typo), verify:web, pre-ship,
  or triad/type safety checks.
---

# Harshcheck — Alchemist pre-ship verification

## Harshcheck protocol (agents)

### Execution

**Always run `pnpm verify:harsh` from the monorepo root before suggesting or landing a UI change** (or equivalent: you ran it in-session and it was green). If the diff touches **`apps/web-app`** in a way that affects build output, prefer a full **`pnpm harshcheck`** once before merge (adds **`next build`**).

### Verification chain (what “green” is made of)

Canonical one-shot: **`pnpm verify:harsh`** runs **`scripts/run-verify-with-summary.mjs`** — **`shared-types` build** → **Turbo typecheck** (excludes `mobile-app`) → **`pnpm test:engine`**. It does **not** run **`next build`**.

| Step | Command (root) | Role |
|------|----------------|------|
| 1. Shared build | `pnpm --filter @alchemist/shared-types build` | `dist/` types for consumers |
| 2. Engine tests | `pnpm --filter @alchemist/shared-engine test` (= **`pnpm test:engine`**) | Triad, gates, Vitest |
| 3. Web build | `pnpm --filter @alchemist/web-app build` | Production **`next build`** — included in **`pnpm harshcheck`** / **`pnpm verify:web`**, not in **`verify:harsh`** |

**Package names:** **`@alchemist/shared-types`**, **`@alchemist/shared-engine`**, **`@alchemist/web-app`** — not unscoped `shared-types` / `web-app` filters alone.

### Goal: Triad output typing

**Zero tolerance for `any` on Triad-shaped data.** Preset pipeline outputs must use **`@alchemist/shared-types`** (`AICandidate`, `AIAnalysis`, `Panelist`, `SerumState`, etc.). Do not annotate triad API or UI props as `any`; do not use `as any` to bypass gates. If types are wrong, fix **`shared-types`** or the route handler, not the consumer with `any`.

### Non-goals (do not ship or “verify into” existence)

**WASM / browser `.fxp`:** **`pnpm harshcheck`** can be green **without** Rust — **`@alchemist/fxp-encoder`** may use the stub **`skip-if-no-rust`** path. **Export .fxp** in the UI still needs **`packages/fxp-encoder`** **`pnpm run build:wasm`** and **`GET /api/health/wasm`** → **`available`** — **`docs/FIRESTARTER.md` §10**, **`docs/FIRE.md` §C**.

**No shadow kernel / KGB / amnesia:** Do not implement layered **“omnipotent”** kernels, **Slavic bypass**, hidden stderr, single-event-only telemetry, or **buffer wipes**. Harshcheck expects **auditable** **`logEvent`** lines where features exist — see **`FIRE.md` §I** (arbitration), **§J** (Talent hints only), **§K** (AGL provenance).

**Post-verify (auditable):** **stderr** ends with **`"event":"verify_post_summary"`** (`exitCode`, `durationMs`, `failedStep`, `soeHint`). Grep/parse that line for CI or SOE hints — see **`docs/FIRE.md` §E1**, **`FIRESTARTER` §9**.

---

## Default action (full pre-ship)

From **monorepo root** (folder with `apps/` + `packages/`, not only `vst/`):

```bash
pnpm harshcheck
```

**Equals** `pnpm verify:web`: same script as **`verify:harsh`** plus **`next build`** for **`@alchemist/web-app`**.

**Typo:** **`harshcheck`** — not `harshchek`.

## Faster loop (no `next build`)

```bash
pnpm verify:harsh
```

Use for daily iteration and **before UI suggestions**; run **`pnpm harshcheck`** before release or when changing **`apps/web-app`** build-affecting code.

## When the user asks you to “run harshcheck”

1. **`cd`** to repo root if the workspace is **`vst/`**, use `cd ..` or run **`pnpm harshcheck`** from **`vst/`** (forwards to parent).
2. Execute **`pnpm verify:harsh`** (UI / fast) or **`pnpm harshcheck`** (full) in the terminal (request permissions if sandbox blocks). Web dev: **`pnpm dev`** runs **`dev-server.mjs`** directly (not Turbo); use banner **`127.0.0.1`** if **`localhost`** fails.
3. If **typecheck** fails after API route renames: suggest **`pnpm web:dev:fresh`** or delete **`apps/web-app/.next`**.
4. If **Next** won’t resolve: **`pnpm alc:doctor`** (**never** `pnpm doctor`) then **`pnpm install`** at root.
5. **`EMFILE` / Watchpack:** polling + **`WATCHPACK_POLLING`** when unset; **`ulimit -n 65536`** or **`WATCHPACK_POLLING=0`** to opt out — **`RUN.txt`**, **`vst/README.md`**.
6. **`MODULE_NOT_FOUND`** under **`.next`**: **`pnpm run clean`** or **`pnpm web:rebuild`** — **`docs/FIRE.md` §L**.

## Offset HARD GATE (Serum / `.fxp`)

Not part of `harshcheck` by default. When `tools/sample_init.fxp` exists:

```bash
pnpm test:gate
python3 tools/validate-offsets.py <path-to-init.fxp>
```

Encoder work needs validated **`packages/fxp-encoder/serum-offset-map.ts`** — see **`.cursor/rules/alchemist-brief.mdc`**.

## What `pnpm test:engine` covers (representative)

| Area | Tests (under `packages/shared-engine/tests/`) |
|------|-----------------------------------------------|
| Triad stub / weights / prompt guard | `engine-harsh.test.ts` |
| Undercover + Slavic gates | `undercover-slavic.test.ts` |
| Governance + SOE | `triad-panel-governance.test.ts`, `soe.test.ts` |
| Taxonomy | `taxonomy-engine.test.ts`, `taxonomy-sparse-rank.test.ts` |
| Arbitration | `transparent-arbitration.test.ts` |
| Talent / AGL | `talent-market-scout.test.ts`, `learning-great-library.test.ts` |
| Perf boss (JSON telemetry) | `compliant-perf-boss.test.ts` |
| IOM test↔cell map | `iom-coverage.test.ts` (+ per-cell maps in `iom-coverage.ts`) |
| Preset share (IOM bridge; types only) | `preset-share-cell.test.ts` |

**Web-app Vitest** (`pnpm --filter @alchemist/web-app test`) covers **`sharePreset`** etc. — **not** invoked by default **`verify:harsh`**.

## Optional: engine perf JSON (not harshcheck)

```bash
pnpm perf:boss
```

Stderr: **`perf_boss_*`** lines — see **`packages/shared-engine/perf/README.md`**.

## Canonical docs

- **`docs/FIRE.md`** — snapshot, §E verify list, §H–§L.  
- **`docs/FIRESTARTER.md`** — §9 scripts, Appendix A workflow.  
- **`AGENTS.md`** — agent checklist.

## Agent checklist (post-run)

- [ ] **Before UI recommendations:** **`pnpm verify:harsh`** green (or stricter **`harshcheck`** if web build needed).  
- [ ] **Triad types:** no new **`any`** on candidates / analysis; use **`shared-types`**.  
- [ ] Capture the final **`verify_post_summary`** JSON from **stderr** when reporting green/red (optional but useful for audits).  
- [ ] Report **PASS/FAIL** per command output.  
- [ ] On **FAIL**: point to first failing package + file; suggest **`web:dev:fresh`** or **`pnpm run clean`** for stale Next / `.next`.  
- [ ] Remind: **`shared-types`** edits need **`pnpm --filter @alchemist/shared-types build`** (or harshcheck / verify:harsh does it first).
