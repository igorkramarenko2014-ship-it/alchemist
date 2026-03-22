# `docs/` — canonical specs

## Doc logic (two-law split)

| Read | Job |
|------|-----|
| **[FIRESTARTER.md](./FIRESTARTER.md)** | **Recovery bible** — full project orientation (layout, triad, gates, scripts, WASM, legal §14, appendices). **§5b** = **`shared-engine`** implementation truth. **Start here** if docs are missing or you need depth. |
| **[FIRE.md](./FIRE.md)** | **Lightweight assessment** — **§E** verify→assess→suggest, **§F–§L** contracts. **Auto block:** **`pnpm fire:sync`** refreshes Vitest counts + Next version (**`ALCHEMIST:FIRE_METRICS`** comments). Optional **`ALCHEMIST_FIRE_SYNC=1`** on **`pnpm harshcheck`** / **`verify:harsh`**. Hooks: **`verify_post_summary`**, SOE. |

**After a material change:** update **FIRESTARTER** (full narrative). Update **FIRE** **§E–§L** only when **contracts** change; run **`pnpm fire:sync`** for metrics. Details: **[FIRESTARTER.md](./FIRESTARTER.md)** **Doc logic**.

---

| File | Purpose |
|------|---------|
| **[FIRESTARTER.md](./FIRESTARTER.md)** | Full bible + doc split vs FIRE |
| **[FIRE.md](./FIRE.md)** | Assessment snapshot, **harshcheck**, **`verify_post_summary`**, §E–§L |
| **[AGENT-PLAYBOOK.md](./AGENT-PLAYBOOK.md)** | Optional FIRE-aligned agent steps — **not** substitute for FIRE |

**Agent workflow (optional):** **`pnpm check:transparent`** — **`scripts/check-no-shadow-patterns.mjs`** on **`packages/shared-engine/**/*.ts`**.

**Legal / privacy (not legal advice):** **FIRESTARTER §14** + **FIRE §G**; root **`../LEGAL.md`**, **`../PRIVACY.md`**, **`../LICENSE`**, **`../SECURITY.md`**. Web: **`apps/web-app/components/legal/LegalDisclaimer.tsx`**.

**Also:** `../apps/web-app/docs/MERCURY-BALL.md`, root `README.md`, `AGENTS.md`, `.cursorrules`, **`../vst/README.md`**, **`../research/README.md`** (optional Python research — not product canon).

**List markdown:** `pnpm docs:list`
