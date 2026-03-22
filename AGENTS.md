# AGENTS.md — for coding assistants

**Repo:** Alchemist monorepo (Next.js web-app, packages, WASM encoder, `vst/` slice).

## Read first

1. **[`docs/FIRESTARTER.md`](docs/FIRESTARTER.md)** — **recovery bible** / full orientation; **Doc logic** (vs FIRE); **Appendix A** workflow; **Appendix B** INIT  
2. **[`docs/FIRE.md`](docs/FIRE.md)** — **lightweight** outside assessment + §E–§L; machine metrics via **`pnpm fire:sync`** (**`ALCHEMIST:FIRE_METRICS`** HTML comments)  
3. **[`docs/AGENT-PLAYBOOK.md`](docs/AGENT-PLAYBOOK.md)** — optional transparent triad / ops-hint steps; **`pnpm check:transparent`** for shadow-pattern denylist scan  
4. **[`.cursorrules`](.cursorrules)** (repo root) — compressed context  
5. **[`docs/README.md`](docs/README.md)** — `docs/` index  
6. **[`.cursor/rules/alchemist-brief.mdc`](.cursor/rules/alchemist-brief.mdc)** — HARD GATE, build order, triad weights  
7. **[`.cursor/rules/alchemist-dsp-vs-ts-gates.mdc`](.cursor/rules/alchemist-dsp-vs-ts-gates.mdc)** — Undercover/Slavic = TS gates, not VST DSP  
8. **[`.cursor/rules/alchemist-quality.mdc`](.cursor/rules/alchemist-quality.mdc)** — scoped edit checklist (HARD GATE, triad, scripts)  
9. **[`.cursor/rules/alchemist-role-mission.mdc`](.cursor/rules/alchemist-role-mission.mdc)** — always-on **Lead Architect** role, mission, **`/plan` / `/fix` / `/refactor` / `/audit`** overrides (align with Cursor user rules)  
10. **[`.cursor/rules/alchemist-aji-fluidic.mdc`](.cursor/rules/alchemist-aji-fluidic.mdc)** — optional **OpenCV + OSC** “Lava–Aji” bridge (**`research/lava-aji-bridge/`**) — **not** TS triad/gates; see **`alchemist-dsp-vs-ts-gates.mdc`**  
11. **[`LEGAL.md`](LEGAL.md)** — not legal advice; trademarks (Serum / Xfer), AI provider ToS, telemetry, warranty, consumer-product gaps  
12. **[`PRIVACY.md`](PRIVACY.md)** — draft privacy template (fill before public beta)  
13. **[`SECURITY.md`](SECURITY.md)** — vulnerability reporting (no public disclosure for active issues)  

## Hard rules

- **No** encoder / `.fxp` / authoritative `SerumState` values without validated **`packages/fxp-encoder/serum-offset-map.ts`** and **`tools/validate-offsets.py`** on a real Serum `.fxp`.  
- **Browser export** needs wasm-pack output in **`packages/fxp-encoder/pkg/`** (`pnpm run build:wasm` with Rust). Health: **`GET /api/health/wasm`**. See **`docs/FIRESTARTER.md` §10**, **`docs/FIRE.md` §C**.  
- **`shared-types`** is schema source of truth; after edits run **`pnpm --filter @alchemist/shared-types build`** (or **`pnpm harshcheck`**).  
- Open workspace **repo root** *Vibe Projects*, not only **`vst/`**, when editing `apps/` or `packages/`.

## Commands

```bash
pnpm install
pnpm alc:doctor       # NOT pnpm doctor
pnpm dev              # or pnpm dev:web
pnpm harshcheck       # pre-ship (spell: harshcheck not harshchek)
pnpm verify:harsh     # faster: no next build
pnpm web:dev:fresh    # stale Next / shared-engine
pnpm web:rebuild      # before next start after package changes
pnpm docs:list        # list first-party markdown
pnpm perf:boss        # shared-engine perf sweep (perf_boss_* JSON on stderr)
pnpm check:transparent # denylist scan: no shadow / KGB / amnesia patterns in shared-engine .ts
pnpm fire:sync         # after green verify: refresh docs/FIRE.md Vitest + Next metrics block
```

See **[`RUN.txt`](RUN.txt)** for a copy-paste one-liner.

## UI / Mercury

**[`apps/web-app/docs/MERCURY-BALL.md`](apps/web-app/docs/MERCURY-BALL.md)**
