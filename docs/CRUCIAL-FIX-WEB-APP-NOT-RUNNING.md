# Crucial fix: web app not running

**Audience:** Claude (and other coding assistants) plus humans. **Scope:** Next.js **`apps/web-app`** in the Alchemist monorepo — not the separate JUCE/VST tree unless that project has its own README.

---

## 0. Preconditions (check first)

1. **Working directory** is the **monorepo root**: the folder that contains **`apps/`** and **`packages/`**. Opening only **`vst/`** in the editor is fine if scripts **`cd ..`** to root — but **`pnpm dev`** / **`pnpm verify:harsh`** must run from the root that has **`package.json`** with workspace **`apps/*`**.
2. **`git rev-parse --show-toplevel`** should equal that root. If it resolves to **`$HOME`**, fix mistaken **`~/.git`** (see **`FIRESTARTER.md` §2a**).
3. Use **`pnpm alc:doctor`** — **never** **`pnpm doctor`** (pnpm built-in).

---

## 1. “App won’t load” / connection refused / wrong tab

| Cause | Fix |
|--------|-----|
| Dev not running | From root: **`pnpm dev`** (same as **`pnpm dev:web`** — uses **`apps/web-app/scripts/dev-server.mjs`**). |
| Wrong URL | **Port is not always 3000.** Next scans **3000–3120**. Use the URL from the **cyan “Ready”** banner (**`127.0.0.1`** line). |
| Stale browser tab | Hard refresh; try the **127.0.0.1** URL from the banner, not an old port. |

**Calibration / scripts:** **`BASE_URL=http://127.0.0.1:<PORT> pnpm test:real-gates`** — **`<PORT>`** must match the banner, not a guess.

---

## 2. Production build fails: `PageNotFoundError` / `ENOENT` for App Router routes (e.g. `/api/health`) during “Collecting page data”

**Cause:** Corrupt or **partial** **`apps/web-app/.next`** (interrupted build, Turbo race, OOM).

**Fix (from monorepo root):**

```bash
pnpm run clean
pnpm harshcheck
```

or

```bash
pnpm web:rebuild
```

**Note:** **`apps/web-app`** **`pnpm run build`** already runs **`clean`** then **`next build`** — if Turbo still fails, **`pnpm run clean`** at **root** clears **`.turbo`** and **`.next`**.

---

## 3. Triad “stuck at 8000 ms” / zero candidates after pulling new code

**Cause:** The **browser** **`runTriad`** client timeout used to cap every panelist **`fetch`** at **`AI_TIMEOUT_MS` (8000)** while **`POST /api/triad/qwen`** allowed a longer server upstream call — mismatch. **Shipped fix:** **`TRIAD_PANELIST_CLIENT_TIMEOUT_MS`** (**QWEN** **18_000** ms) in **`packages/shared-engine/constants.ts`**, used in **`triad.ts`**.

**You still must:**

- **Restart `pnpm dev`** after changing **`packages/shared-engine`** or **`app/api/triad/*`**. Next dev may not reliably hot-reload the **`transpilePackages`** workspace package for triad behavior.
- **Pull** latest and restart so server routes and client bundle match.

---

## 4. Groq Llama: valid provider response but JSON parse fails / truncated mid-array

**Cause:** **`max_tokens`** too small for **8** candidates with **128**-element **`paramArray`** JSON.

**Fix:** **`apps/web-app/lib/fetch-llama-candidates.ts`** — raise **`max_tokens`** (e.g. **4096**). Restart **`pnpm dev`**.

---

## 5. Watchers / `EMFILE` / dev cache weirdness

- **`pnpm dev:recover`** — clears **`apps/web-app/.next/cache/{webpack,swc}`** then dev.
- **`pnpm web:dev:fresh`** — root **`clean`** + dev server.
- Polling / Watchpack: **`FIRE.md` §L**, **`FIRESTARTER.md` §8**, **`RUN.txt`**.

---

## 6. One-shot recovery ladder (run in order)

```bash
cd /path/to/monorepo-root   # must contain apps/ and packages/
pnpm alc:doctor
pnpm run clean
pnpm install                  # only if doctor / install is broken
pnpm verify:harsh
pnpm dev
```

Then open the **exact** URL printed in the **cyan Ready** line.

---

## Canonical references

| Doc | Use |
|-----|-----|
| **`docs/FIRESTARTER.md` §8** | Web app dev, clean, rebuild, **`vst/`** forwarding |
| **`docs/FIRE.md` §L** | Web shell, **`.next`** recovery, dev server contract |
| **`RUN.txt`** | Copy-paste commands |
| **`AGENTS.md`** | Assistant orientation + **`pnpm`** script names |

---

**Footer:** This file is **operational recovery** for “app not running” and common **Next + triad** foot-guns. **Assessment law** stays in **`FIRE.md`**; **full orientation** in **`FIRESTARTER.md`**.
