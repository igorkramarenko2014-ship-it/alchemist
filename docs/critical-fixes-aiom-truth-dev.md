# Critical fixes — AIOM truth, runtime health, and local dev (2026-03)

Operational record of **high-impact** fixes that closed contract drift, build flakiness, and “app down” loops. For full product law see **`docs/FIRESTARTER.md`** and **`docs/FIRE.md`**.

## When to read this

- Auditing why **`artifacts/truth-matrix.json`**, **`GET /api/health/truth-matrix`**, or **`GET /api/health/ultimate`** disagree.
- **`next build`** failed with **`/_document`** or white-page confusion.
- Local **`pnpm dev`** should self-heal after crashes.

## Summary

| Area | Problem | Fix |
|------|---------|-----|
| Fire metrics truth layer | Derived string `initiatorManifestStatus` duplicated MON | Removed from **`docs/fire-metrics.json`**; generator only writes **`mon`** + hashes |
| Truth artifact ↔ runtime | `canonicalMetrics` looked like a second naming scheme | **`artifact`** field exposes canonical JSON 1:1; **`canonicalMetrics`** = alias of **`artifact.metrics`** |
| PNH in contract | Arithmetic in public expectations | **`metrics.pnhImmunity`** object: `{ passed, total, breaches, status }` where **`status`** in **`clean` \| `breach`** |
| Sync time | Mixed date-only vs timestamp in truth | **`metrics.syncedAtUtc`** — ISO-8601 datetime in truth artifact |
| Schema / human checks | “Confirm fields exist” manual step | **`scripts/validate-truth-matrix.mjs`** + **`pnpm fire:sync`** fail closed; brief updated |
| Ultimate audit | `ok: false` after green `verify-web` | **`isUltimateAuditPass()`** — no `fail` checks, **`verify_ci`** pass, integrity ok |
| Next build | `PageNotFoundError: /_document` | **`apps/web-app/pages/_document.tsx`** compatibility shim |
| Dev auto-up | Watchdog not on default `pnpm dev` | **`pnpm dev`**, **`pnpm dev:web`**, **`go`** → **`scripts/dev-guardian.mjs`** |

## Key files

| Path | Role |
|------|------|
| `artifacts/truth-matrix.json` | Canonical truth artifact |
| `artifacts/truth-matrix.schema.json` | JSON Schema shape (draft 2020-12) |
| `scripts/aggregate-truth.mjs` | Writes truth artifact from verify + fire-metrics |
| `scripts/validate-truth-matrix.mjs` | Structural + invariant checks |
| `scripts/validate-fire-metrics.mjs` | **`docs/fire-metrics.json`** validation |
| `apps/web-app/lib/truth-matrix.ts` | Snapshot, **`artifact`**, parity, ultimate helper |
| `apps/web-app/app/api/health/truth-matrix/route.ts` | Truth-matrix JSON |
| `apps/web-app/app/api/health/ultimate/route.ts` | Ultimate audit JSON |
| `scripts/sync-external-brief.mjs` | Regenerates **`docs/AIOM-Technical-Brief.md`** marker blocks |
| `scripts/dev-guardian.mjs` | Dev watchdog (health polling + restart) |
| `scripts/dev-alchemist-port.mjs` | Frees port, starts web-app dev |

## Verification (operator)

`pnpm verify:harsh` and `pnpm fire:sync` both run **`scripts/aggregate-truth.mjs`** before truth / fire-metrics validation so `artifacts/truth-matrix.json` stays aligned with `verify-post-summary` + `docs/fire-metrics.json`.

```bash
pnpm verify:harsh
pnpm fire:sync
sha256sum -c docs/fire-metrics.sha256
```

Truth artifact:

```bash
node scripts/validate-truth-matrix.mjs
jq '.' artifacts/truth-matrix.json | head
```

Runtime (with app running):

```bash
curl -sS http://127.0.0.1:3000/api/health/truth-matrix | jq '.artifact.schemaVersion, .artifact.metrics.pnhImmunity.status'
curl -sS http://127.0.0.1:3000/api/health/ultimate | jq '.ok'
```

## Notes

- **`pnpm dev`** / **`pnpm dev:web`** run **`dev-guardian`** on port **3000** by default; use the **cyan banner URL** if another process occupies `:3000`.
- Browser **`GET /api/health/wasm`** remains the gate for WASM export UI — see **`docs/FIRESTARTER.md`** and **`docs/FIRE.md`**.
