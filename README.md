# Alchemist (Vibe Projects)

Monorepo: **web-app**, **mobile-app**, **packages** (`shared-types`, `shared-engine`, `fxp-encoder`, …), **tools**, **vst**.

## Quick start

**Default workflow:** **`docs/FIRESTARTER.md`** → **Appendix A** (doctor → dev → verify).  
See **[`RUN.txt`](./RUN.txt)** — one-liner to install deps and run dev.

**Full pre-ship loop (harshcheck):** `pnpm harshcheck` (= `pnpm verify:web`) — rebuild **`shared-types`**, typecheck, **`shared-engine` Vitest**, production **`next build`**. See **`.cursor/skills/harshcheck/SKILL.md`**.

```bash
cd "/Users/igorkramarenko/Desktop/Vibe Projects"
pnpm install
pnpm dev          # web app — direct dev-server (same as dev:web; no Turbo wrapper)
# pnpm dev:turbo  # optional: same app via turbo run dev
# pnpm alc:doctor # checks Node, install, Next resolve (not `pnpm doctor` — pnpm built-in)
# pnpm dev:all    # web + Expo — Expo often needs its own terminal / setup
```

**App “won’t run”?** Open the **cyan banner URL** (`http://127.0.0.1:PORT`) — **not** `http://localhost:…` if your OS maps localhost → **IPv6** (`::1`) while Next listens on **IPv4**. Dev binds **`HOST=127.0.0.1`** by default; override with **`HOST=0.0.0.0`** for LAN. If **`Could not resolve Next.js`**, run **`pnpm install`** from **this repo root** (not only `vst/`). **`EMFILE` / Watchpack:** dev uses webpack polling + **`WATCHPACK_POLLING=true`** when unset; **`ulimit -n 65536`** or **`WATCHPACK_POLLING=0 pnpm dev`** to opt out — **`RUN.txt`**, **`vst/README.md`**. Free a stuck port: `lsof -i :3000` → `kill <pid>`.

**Stale UI / old `shared-engine` behaviour?** Clear Next cache and restart:

```bash
pnpm web:dev:fresh
# or (alias):  pnpm app:repair
```

**App shows 404 / blank / “error components” in dev?** From repo root: **`pnpm app:repair`** (full clean + dev) or **`ALCHEMIST_NEXT_HEAL=1 pnpm dev`** (deletes only `apps/web-app/.next` then starts).

**Production build** (`next start`) after code changes:

```bash
pnpm web:rebuild
pnpm --filter @alchemist/web-app start
```

## Status (as of now)

| Check | Command / note |
|-------|----------------|
| **Environment** | **`pnpm alc:doctor`** |
| **Fast verify** | **`pnpm verify:harsh`** — types + **`pnpm test:engine`** (**`shared-engine`** Vitest; counts in **`docs/FIRE.md`** machine block after **`pnpm fire:sync`**) |
| **Pre-ship** | **`pnpm harshcheck`** — adds **`next build`** web-app |
| **Post-verify JSON** | **`verify_post_summary`** on **stderr** (after harsh/web verify) — **`soeHint`**, duration, `failedStep`; auditable ops line |
| **Engine perf JSON** | **`pnpm perf:boss`** — stderr **`perf_boss_*`** lines |
| **Transparent hygiene** | **`pnpm check:transparent`** — denylist scan on **`shared-engine`**.ts (**`FIRE.md` §I**) |
| **Offset gate hint** | **`pnpm test:gate`** (needs local **`tools/sample_init.fxp`** to run Python) |
| **Offset validate (when sample present)** | **`pnpm validate:offsets`** / **`pnpm assert:hard-gate`** — runs **`validate-offsets.py <fxp>`**; assert prints explicit OK; **`ALCHEMIST_STRICT_OFFSETS=1`** fails if sample missing |
| **Triad HTTP** | Live panelists when env keys set (DeepSeek / Qwen / Groq Llama); Qwen endpoint from **`QWEN_BASE_URL`** (default DashScope-style; OpenRouter **`qwen/qwen-plus`** when URL indicates OpenRouter). Truth in **`GET /api/health`** → **`triad`** — **`docs/FIRESTARTER.md` §5a** |
| **Truth docs** | **`docs/`** laws: **`FIRESTARTER.md`** + **`FIRE.md`**; **`docs/archive/alchemist-*.html`** Composer packs (**§12**); optional agent steps **Appendix C** |
| **Browser `.fxp` export** | Rust + **`cd packages/fxp-encoder && pnpm run build:wasm`** — UI uses **`GET /api/health/wasm`**; see **`docs/FIRESTARTER.md` §10**, **`docs/FIRE.md` §C** |

## Legal

**Not legal advice.** Trademarks (e.g. **Serum** / **Xfer Records**), AI **ToS**, presets at your own risk, telemetry, no-warranty — **[`LEGAL.md`](./LEGAL.md)**. **Privacy template:** **[`PRIVACY.md`](./PRIVACY.md)** (customize before public launch). License: **[`LICENSE`](./LICENSE)**. **Security:** **[`SECURITY.md`](./SECURITY.md)**. Web footer: **`apps/web-app/components/legal/LegalDisclaimer.tsx`**.

## Documentation

| Doc | Purpose |
|-----|---------|
| [`docs/FIRESTARTER.md`](./docs/FIRESTARTER.md) | **Comprehensive** bible + **Doc logic** (vs FIRE) + **Appendix A–D** (workflow, INIT, optional agent checklist, Aji notes) |
| [`docs/FIRE.md`](./docs/FIRE.md) | **Outside assessment** / LLM surface — snapshot, **next moves**, **harshcheck**, §E–§L, **`pnpm fire:sync`** metrics block |
| `docs/archive/alchemist-*.html` | **Composer** task packs (open in browser) — **FIRESTARTER §12** |
| [`.cursorrules`](./.cursorrules) | Root Cursor context |
| [`apps/web-app/docs/MERCURY-BALL.md`](./apps/web-app/docs/MERCURY-BALL.md) | Mercury orb + dock (incl. export / share affordances) |
| [`docs/iom-architecture.md`](./docs/iom-architecture.md) | IOM power cells (**`pnpm igor:docs`**) |
| [`AGENTS.md`](./AGENTS.md) | Checklist for AI agents |
| [`research/README.md`](./research/README.md) | **Python research** (strategic fusion, Lava–Aji OSC) — not the TS preset pipeline |

## Version control

```bash
git init
git add -A
git status   # review
git commit -m "chore: initial snapshot"
```

Commit often so you can return to a known state.

## Cursor / IDE

Open **`Vibe Projects`** (repo root), not only **`vst/`**, so `apps/` and `packages/` are visible.

**`Panelist` / `shared-types` edits:** run **`pnpm --filter @alchemist/shared-types build`** (or **`pnpm verify:web`**, which does this first) so **`dist/*.d.ts`** matches **`index.ts`**. If you delete or rename **`app/api/**`** routes, run **`pnpm web:dev:fresh`** or remove **`apps/web-app/.next`** before **`tsc`** so stale **`.next/types`** don’t break typecheck.

## Rules

[`.cursor/rules/alchemist-brief.mdc`](./.cursor/rules/alchemist-brief.mdc) — HARD GATE on `serum-offset-map.ts`, build order, AI triad weights, design tokens.

## Useful scripts

| Command | What |
|---------|------|
| `pnpm clean` | Remove `.next`, `.turbo`, stop turbo daemon |
| `pnpm web:dev:fresh` | Clean + web dev-server (smart port / HOST) |
| `pnpm dev:recover` | Clear **`apps/web-app/.next/cache/{webpack,swc}`** then start dev (fixes many corrupt dev caches) |
| `pnpm web:rebuild` | Clean + forced turbo build (web-app) |
| `pnpm docs:list` | List first-party markdown |
| `pnpm verify:harsh` | Types + Vitest (`shared-engine`) — fast; ends with **`verify_post_summary`** on stderr |
| `pnpm verify:web` / `pnpm harshcheck` | Full: types + Vitest + `next build` web-app; same summary line |
| `pnpm test:engine` | Vitest only in `shared-engine` |
| `pnpm perf:boss` | `shared-engine` hot-path timings → stderr **`perf_boss_*`** JSON (see `packages/shared-engine/perf/README.md`) |
| `pnpm check:transparent` | Regex denylist on **`shared-engine`**.ts — shadow-pattern hygiene (**`FIRE.md` §I**) |
| `pnpm test:gate` | Prints offset-gate Python command when `sample_init.fxp` exists |
| `./scripts/fresh-web.sh` | Same idea as `web:dev:fresh` |
