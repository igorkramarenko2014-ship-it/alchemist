# AGENTS.md — for coding assistants

**Repo:** Alchemist monorepo (Next.js web-app, packages, WASM encoder, `vst/` slice).

## Read first

1. **[`docs/FIRESTARTER.md`](docs/FIRESTARTER.md)** — **recovery bible** / full orientation; **Doc logic** (vs FIRE); **Appendix A** workflow; **Appendix B** INIT; **Appendix C** optional agent checklist (transparent triad, **`pnpm check:transparent`**); **Appendix D** Aji notes  
2. **[`docs/FIRE.md`](docs/FIRE.md)** — **lightweight** outside assessment + §E–§L; machine metrics via **`pnpm fire:sync`** (**`ALCHEMIST:FIRE_METRICS`** HTML comments)  
3. **[`.cursorrules`](.cursorrules)** (repo root) — compressed context  
4. **[`.cursor/rules/alchemist-brief.mdc`](.cursor/rules/alchemist-brief.mdc)** — HARD GATE, build order, triad weights  
5. **[`.cursor/rules/alchemist-dsp-vs-ts-gates.mdc`](.cursor/rules/alchemist-dsp-vs-ts-gates.mdc)** — Undercover/Slavic = TS gates, not VST DSP  
6. **[`.cursor/rules/alchemist-quality.mdc`](.cursor/rules/alchemist-quality.mdc)** — scoped edit checklist (HARD GATE, triad, scripts)  
7. **[`.cursor/rules/alchemist-role-mission.mdc`](.cursor/rules/alchemist-role-mission.mdc)** — always-on **Lead Architect** role, mission, **`/plan` / `/fix` / `/refactor` / `/audit`** overrides (align with Cursor user rules)  
8. **[`.cursor/rules/alchemist-aji-fluidic.mdc`](.cursor/rules/alchemist-aji-fluidic.mdc)** — optional **OpenCV + OSC** “Lava–Aji” bridge (**`research/lava-aji-bridge/`**) — **not** TS triad/gates; see **`alchemist-dsp-vs-ts-gates.mdc`**  
9. **[`LEGAL.md`](LEGAL.md)** — not legal advice; trademarks (Serum / Xfer), AI provider ToS, telemetry, warranty, consumer-product gaps  
10. **[`PRIVACY.md`](PRIVACY.md)** — draft privacy template (fill before public beta)  
11. **[`SECURITY.md`](SECURITY.md)** — vulnerability reporting (no public disclosure for active issues)  

## Hard rules

- **No** encoder / `.fxp` / authoritative `SerumState` values without validated **`packages/fxp-encoder/serum-offset-map.ts`** and **`tools/validate-offsets.py`** on a real Serum `.fxp`.  
- **Browser export** needs wasm-pack output in **`packages/fxp-encoder/pkg/`** (`pnpm run build:wasm` with Rust). Health: **`GET /api/health/wasm`**. See **`docs/FIRESTARTER.md` §10**, **`docs/FIRE.md` §C**.  
- **`shared-types`** is schema source of truth; after edits run **`pnpm --filter @alchemist/shared-types build`** (or **`pnpm harshcheck`**).  
- Open workspace **repo root** *Vibe Projects*, not only **`vst/`**, when editing `apps/` or `packages/`.

## Commands

```bash
pnpm install
pnpm alc:doctor       # NOT pnpm doctor
pnpm env:check        # apps/web-app/.env.local Groq line format (KEY=value, not bare gsk_)
pnpm check:ready      # env:check + verify:harsh — quick “OK to dev?” before pnpm dev
pnpm verify:keys      # live Groq / DeepSeek / Qwen probe (.env.local; Qwen URL/model from QWEN_BASE_URL; no secrets printed)
pnpm test:real-gates  # gate calibration vs live triad routes → stderr calibration_*; local tools/gate-calibration-output.json (gitignored)
pnpm dev              # or pnpm dev:web
pnpm harshcheck       # pre-ship (spell: harshcheck not harshchek)
pnpm verify:harsh     # faster: no next build
pnpm web:dev:fresh    # stale Next / shared-engine
pnpm app:repair       # alias → web:dev:fresh (corrupt .next / dev 404 on /)
pnpm web:rebuild      # before next start after package changes
pnpm docs:list        # list first-party markdown
pnpm perf:boss        # shared-engine perf sweep (perf_boss_* JSON on stderr)
pnpm check:transparent # denylist scan: no shadow / KGB / amnesia patterns in shared-engine .ts
pnpm build:wasm        # Rust + wasm-pack → browser Export .fxp (needs rustup + wasm32-unknown-unknown)
pnpm fire:sync         # after green verify: refresh docs/FIRE.md Vitest + Next metrics block
```

See **[`RUN.txt`](RUN.txt)** for a copy-paste one-liner.

## Composer prompt packs (browser)

**[`docs/alchemist-cursor-prompts.html`](docs/alchemist-cursor-prompts.html)** · **[`docs/alchemist-high-efficiency-prompts.html`](docs/alchemist-high-efficiency-prompts.html)** · **[`docs/alchemist-cpc-execution-plan.html`](docs/alchemist-cpc-execution-plan.html)** · **[`docs/alchemist-full-unblock-plan.html`](docs/alchemist-full-unblock-plan.html)** — index **`docs/FIRESTARTER.md` §12**; **next moves** summary **`docs/FIRE.md`** Assessment snapshot.

## UI / Mercury

**[`apps/web-app/docs/MERCURY-BALL.md`](apps/web-app/docs/MERCURY-BALL.md)**
