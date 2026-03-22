# Cursor opened `vst/` only?

The **Next.js app** is **`../apps/web-app`**. This folder is a thin slice so scripts can reach the monorepo root.

**New AI session?** **`../docs/FIRESTARTER.md`** (Appendix B INIT) + repo root **`../.cursorrules`** — Triad/Greek = **TS telemetry**, not DSP. **`vst/docs/FIRE.md`** / **`FIRESTARTER.md`** are symlinks to **`../docs/...`** (single source).

**Export .fxp in the browser:** needs **`packages/fxp-encoder`** built with **`pnpm run build:wasm`** (Rust). **`GET /api/health/wasm`** on the web app reflects readiness — **`docs/FIRESTARTER.md` §10**.

## Run the web app

```bash
pnpm install   # once, from repo root: cd .. && pnpm install
pnpm dev         # web-app dev-server (direct; forwards to repo root)
```

**`pnpm: command not found`?** From **`vst/`** use **`npm run dev`** or **`npm run bootstrap`** (they call `node ../scripts/with-pnpm.mjs` and **`npx pnpm@9.14.2`**). Permanent fix: **`corepack enable`** and **`corepack prepare pnpm@9.14.2 --activate`**.

Or from the **monorepo root** (`Vibe Projects/`):

```bash
pnpm install
pnpm dev
```

## If it “won’t run”

0. **Diagnose:** **`pnpm alc:doctor`** from repo root, or **`pnpm alc:doctor`** from `vst/` (forwards to root). **Do not use `pnpm doctor`** — that runs pnpm’s unrelated built-in.
1. **`Could not resolve Next.js`** — from repo root: **`pnpm install`** (not only inside `vst/`).
2. **Turbo / env weirdness** — web **`pnpm dev`** is already direct (no Turbo). Optional: **`pnpm dev:turbo`** from root. Same: **`pnpm dev:web`**.
3. **`turbo: command not found`** — **`corepack enable`** then **`pnpm install`** at root.
4. **Port in use** — dev scans **3000–3060**; use the **cyan banner** URL (not a guess).
5. **Blank page / connection refused** — open **`http://127.0.0.1:<port>`** from the banner (not **`localhost`** if your OS resolves it to IPv6 **`::1`** while Next binds IPv4). VPN/firewall can break **`localhost`** too.
6. **Stale Next / types** — **`pnpm web:dev:fresh`** (from root or from `vst/` — forwards to root). If **`next build`** / **`harshcheck`** throws **`MODULE_NOT_FOUND`** under **`.next`**, run **`pnpm run clean`** at root (or **`pnpm web:rebuild`**) then retry.
7. **`EMFILE: too many open files, watch`** — repo enables webpack polling + **`WATCHPACK_POLLING=true`** (when unset) in dev; **`ulimit -n 65536`** if needed; opt out: **`WATCHPACK_POLLING=0 pnpm dev`**. See **`RUN.txt`**.
8. **Webpack dev cache / `hasStartTime` / “Restoring pack … failed”** — **`pnpm dev:recover`** (from root or **`vst/`**) clears webpack+swc cache then starts dev; or **`pnpm web:dev:fresh`**; or **`ALCHEMIST_NEXT_SCRUB_WEBPACK=1 pnpm dev`**.
9. **`FAIL @alchemist/shared-engine not resolvable`** from **`pnpm alc:doctor`** — run **`pnpm install`** from **repo root** (workspace links missing).

## Bind to all interfaces (phone / LAN)

```bash
cd ../apps/web-app && HOST=0.0.0.0 node ./scripts/dev-server.mjs
```

Then use your machine’s LAN IP + port.

## Legal & security

**Not legal advice.** **`../LEGAL.md`**, **`../PRIVACY.md`** (template), **`../SECURITY.md`**. Report security issues per **`SECURITY.md`** — not via public issues for active exploits.
