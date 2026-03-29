# Happy Panda module — critical fix autoload (local web dev)

Use this file **outside the repo** (another agent, runbook runner, or paste-in prompt) to **bootstrap** the same recovery path operators use when the web app “won’t run,” the wrong port is open, or Next fails to compile.

**Happy Panda** = *green `next build` from repo root, dev server reachable at the URL printed in the cyan banner, no client bundle pulling Node `fs`.*

**Cursor / chat:** The JSON block below is a **paste-in module** for external runners. **Agents** follow **`.cursor/rules/alchemist-happy-panda-triage.mdc`**: when you say the app is down locally, they should run **`pnpm panda`** and **`pnpm alc:doctor`** before long theory. The **executable** preflight is **`scripts/happy-panda.mjs`** (also runs automatically before **`pnpm dev`** unless `ALCHEMIST_SKIP_PANDA=1`).

**Enforcement summary:** **CWD** — no ghost runs outside monorepo root. **Install** — lockfile / `node_modules` corruption has a documented self-correcting path. **Next.js** — hang-prone CI/Docker runs use **`compile_gate.check`** + kill/clean + **`recovery`**. **Health** — `curl` on **`/api/health`** is the Definition of Done.

---

## Autoload payload (machine-friendly)

Paste or ingest the block below as structured context. Expand `COMMANDS` in order unless a gate fails.

**Compile gate:** use **`run`** for interactive dev (no GNU **`timeout`** — typical macOS). For **CI / agents**, use **`check`** (`timeout 120s …`). On hang or SIGTERM, run **`timeout_abort`** then **`recovery`**. If **`run`** / **`check`** fails with a normal compile error (not hang), use **`recovery_on_compile_failure`**. **`timeout_abort`** uses **`pkill -f next || true`** so **`pnpm run clean`** still runs when no `next` process exists (plain **`pkill && clean`** can skip clean).

**Do not** append a **`compile_timeout`** object to **`gates[]`** with only **`note`** / **`recovery_hint`** — runners that iterate **`gates`** expect **`check`** or **`run`**. The hang contract lives in **`compile_gate`** plus **`automation_hints.compile_timeout`** (alias + optional 60s budget).

```json
{
  "module": "alchemist.happy_panda",
  "version": 6,
  "repo_name": "alchemist",
  "cwd_invariants": [
    "Directory must contain both `apps/` and `packages/` (monorepo root).",
    "If the workspace opened only `vst/` or another subfolder, `cd` up to the root first."
  ],
  "gates": [
    { "id": "cwd", "check": "test -d apps && test -d packages", "fail": "Not in monorepo root (missing apps/ or packages/)" },
    { "id": "node", "check": "node -v", "expect": "major >= 20 (prefer 22 LTS per .nvmrc)" },
    { "id": "pnpm", "check": "pnpm -v", "fallback": "corepack enable && corepack prepare pnpm@9.14.2 --activate" },
    { "id": "env", "check": "test -f apps/web-app/.env.local", "warn": "No .env.local (triad runs in stub mode)" },
    { "id": "doctor", "run": "pnpm alc:doctor", "note": "NOT `pnpm doctor` (pnpm built-in)" },
    { "id": "install", "run": "pnpm install", "recovery": "rm -rf node_modules pnpm-lock.yaml && pnpm install" },
    {
      "id": "compile_gate",
      "run": "pnpm web:next-build",
      "expect": "exit 0",
      "recovery_on_compile_failure": "pnpm run clean && pnpm web:next-build",
      "check": "timeout 120s pnpm web:next-build",
      "timeout_abort": "pkill -f next || true; pnpm run clean",
      "recovery": "pnpm web:next-build",
      "fail": "Build hang or SIGTERM — likely stale SWC/Next cache. Run 'pnpm run clean' and retry."
    }
  ],
  "happy_path_commands": [
    "pnpm install",
    "pnpm alc:doctor",
    "pnpm web:next-build",
    "pnpm fresh:3010"
  ],
  "fallback_commands": [
    "pnpm dev:3010 (if fresh:3010 unavailable)"
  ],
  "browser_rule": "Open ONLY the http://127.0.0.1:PORT URL from the cyan terminal banner — never assume :3000.",
  "architecture_invariant": "Server-only filesystem access for Engine School index: import loadLearningIndex from `@alchemist/shared-engine/node`. Do not re-export loadLearningIndex from the main `@alchemist/shared-engine` entry; client components must not pull `node:fs`.",
  "success_criteria": [
    "pnpm web:next-build exits 0 (interactive run) or compile_gate.check exits 0 (CI timeout-bound)",
    "GET /api/health returns 200 from the cyan banner URL"
  ],
  "automation_hints": {
    "compile_timeout": {
      "id": "compile_timeout",
      "note": "Hang guard is compile_gate.check (timeout 120s pnpm web:next-build). For fail-fast agents (~60s), substitute timeout 60s for 120s in that command; on timeout or hang, abort and run recovery_hint.",
      "recovery_hint": "compile_gate.timeout_abort; then compile_gate.recovery; if errors persist, compile_gate.recovery_on_compile_failure"
    }
  }
}
```

---

## Symptom → action (operator)

| Symptom | Action |
|--------|--------|
| Wrong app / 500 / 404 in browser | Wrong **port** or stale tab. Use cyan banner URL; try `pnpm dev:3010` or `pnpm fresh:3010`. |
| `listen EADDRINUSE` / port fights | `pnpm dev:3010` (or `pnpm dev:3000` which tries to free :3000 via `lsof`). |
| Blank or broken UI after git pull | `pnpm app:repair` (full clean + dev) or `pnpm dev:recover` (lighter webpack/swc cache). |
| `Failed to compile` + `node:fs` / `UnhandledSchemeError` | Broken barrel import: ensure **main** `@alchemist/shared-engine` has **no** `loadLearningIndex`; server uses **`@alchemist/shared-engine/node`**. Then `pnpm install` + `pnpm web:next-build`. |
| “Nothing runs” / missing deps | From root: `pnpm install` or `node scripts/with-pnpm.mjs install`. Never `npm install` only inside `apps/web-app` without the workspace. |
| `next build` stuck / no output forever | Ctrl+C, then **`compile_gate.timeout_abort`** + **`compile_gate.recovery`**. CI/agents: **`compile_gate.check`**. macOS: no GNU **`timeout`** by default — use **`run`** or **`gtimeout 120s pnpm web:next-build`** (Homebrew **coreutils**). |

---

## Copy-paste sequence (max relief)

Run from **monorepo root** (folder whose `package.json` has `"name": "alchemist"` and `workspaces`).

```bash
cd "/path/to/repo-root"
pnpm install
pnpm alc:doctor
pnpm web:next-build
# If `pnpm web:next-build` hangs (stale SWC/Next cache): Ctrl+C, then:
# pkill -f next || true; pnpm run clean && pnpm web:next-build
pnpm fresh:3010
```

Then open the **cyan** `http://127.0.0.1:…` line (expect **3010** if you used `fresh:3010`).

**Success check (after dev is up — replace `3010` with your banner port):**

```bash
curl -sfS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3010/api/health
```

Expect **`200`**.

---

## Verification (quick)

```bash
pnpm --filter @alchemist/web-app typecheck
pnpm web:next-build
```

Optional full engine gate (slower): `pnpm verify:harsh` (spell **`harshcheck`** for pre-ship with Next build).

**Automation / CI:** execute **`gates.compile_gate.check`**. On timeout or SIGTERM, run **`timeout_abort`** then **`recovery`**. On non-timeout compile failure, use **`recovery_on_compile_failure`**. **`pkill -f next`** is broad — avoid on shared runners if other jobs use Next.

**Bootstrap contract:** enforced gates + bounded compile (CI) + **`curl` Definition of Done** ⇒ finite recovery loop toward a working dev server or a hard, documented fail.

---

## Canon pointers (human law, not autoload logic)

- **`docs/FIRESTARTER.md`** — recovery bible, web + WASM notes.
- **`docs/FIRE.md`** — lightweight assessment + metrics (`pnpm fire:sync` after green verify).
- **`RUN.txt`** — one-liners + port discipline.
- **`docs/critical-fixes-aiom-truth-dev.md`** — truth matrix, dev guardian, related ops fixes.

---

## PNH APT victim channel (preflight)

Happy Panda is the **designated victim surface** for **PNH APT-style heuristics** before dev: it scans **argv**, **`NODE_OPTIONS`**, **`npm_config_user_agent`**, and **`ALCHEMIST_*`** values using the same patterns as **`packages/shared-engine/pnh/pnh-apt-prompt-scan.ts`** (`scripts/pnh-preflight-apt.mjs`). This does **not** mutate triad gates — it is **stderr + optional hard stop** only.

| Env | Effect |
|-----|--------|
| **`ALCHEMIST_SKIP_PNH_PREFLIGHT=1`** | Skip the PNH scan (Panda still runs other checks). |
| **`ALCHEMIST_PNH_PREFLIGHT_BLOCK=1`** or **`ALCHEMIST_PNH_STOP_AUTOATTACK=1`** | **Exit non-zero** if any heuristic matches (refuse `pnpm dev`). |
| **`ALCHEMIST_PNH_VERBOSE=1`** | Log **OK** when the victim channel is clean. |

## CLI preflight (in-repo)

**Autoload:** `pnpm dev`, `pnpm dev:3010`, `pnpm fresh:3010`, `pnpm go`, `pnpm web:dev:fresh`, `pnpm dev:recover`, and `vst/` **`pnpm dev`** all run **`happy-panda.mjs` first** (same checks as `pnpm panda`). Skip with **`ALCHEMIST_SKIP_PANDA=1`** (CI or nested tooling).

After preflight, **`pnpm dev`** / **`pnpm go`** / **`pnpm web:dev:fresh`** / **`pnpm dev:recover`** / **`vst` → `pnpm dev`** continue through **`scripts/dev-alchemist-port.mjs`** (default port **3000** — free **:3000**, set **`PORT`**). **`pnpm dev:3010`** / **`fresh:3010`** use **3010** the same way. Optional health watchdog (restart on failure): **`pnpm dev:guardian`** / **`dev:guardian:fresh`** → **`scripts/dev-guardian.mjs`**.

```bash
pnpm panda                  # same gates as autoload (manual)
pnpm panda --health 3010    # after dev is up — expects GET /api/health → 200
```

## Out of scope for this module

- Encoder **HARD GATE** / `serum-offset-map.ts` / `.fxp` authority (see **`AGENTS.md`**).
- Triad API keys and `.env.local` contents (use **`pnpm env:check`** and **`pnpm verify:keys`**).
- Changing Slavic / Undercover gates or blend weights (not a dev-bootstrap concern).
