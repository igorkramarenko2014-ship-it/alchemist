# AIOM — fused principles (Alchemist + architecture review)

This page **fuses** the independent “AIOM Cursor rules” architecture review with **shipped** repo reality. It is the human-readable companion to **`.cursor/rules/alchemist-aiom-verification.mdc`**.

## Canon order (non-negotiable)

1. **Encoder / Serum:** **`serum-offset-map.ts`** + **`validate-offsets.py`** (**HARD GATE**) — not subordinate to AIOM metrics.
2. **Product truth docs:** **`docs/FIRESTARTER.md`**, **`docs/FIRE.md`**.
3. **AIOM verification snapshot:** **`artifacts/truth-matrix.json`** — single **committed** snapshot for **verification metrics** (tests, IOM coverage, PNH immunity summary, WASM status in metrics, MON object, divergences).
4. **Runtime:** **`GET /api/health/truth-matrix`** — **`artifact`** = file 1:1; **`live`** = current checks; **`canonicalMetrics`** = `artifact.metrics`.

AIOM does **not** replace triad blend weights, Slavic/Undercover math, or **`igor-power-cells.json`** authority.

## Principles we enforce now

| Principle | In repo |
|-----------|---------|
| Single snapshot metric namespace for AIOM | `artifact.metrics.*` validated by **`scripts/validate-truth-matrix.mjs`** |
| Divergence + freshness on snapshot | `lib/truth-matrix.ts` + artifact `generatedAtUtc` + **`ALCHEMIST_TRUTH_MAX_AGE_MINUTES`** |
| Verify before claiming green | **`pnpm verify:harsh`** |
| Docs sync after green | **`pnpm fire:sync`** (not a substitute for verify) |
| Live vs stale | **`live.status`** cannot be **`ok`** when snapshot is **`stale_data`** |

## Naming and MON

- **IOM / PNH / MON** are internal shorthand; external docs and APIs should pair with plain-language labels where helpful.
- **MON** is stored only as **`metrics.mon.{value,ready,source}`** on the artifact. Values like **117** are **release/invariant targets** derived from coverage — not a second parallel truth file.

## Optional backlog (review → future sprints)

The following are **not** committed promises until implemented and gated:

- Mutation testing / **Stryker**, **`metrics.mutationScore`**
- **`truth-history.jsonl`**, **`GET /api/health/truth-history`**
- **`divergence-log.jsonl`**, extended **`metrics.lastDivergenceAt`**
- **`metrics.mon.breakdown`**, adversarial PNH tiers, negative-test ratio metrics
- Comparison doc, quickstart, Mermaid diagram — **external adoption** aids

Track design in issues or ADRs; bump **`artifacts/truth-matrix.json`** schema only with validators and brief in lockstep.

## Related docs

- **`docs/AIOM-Technical-Brief.md`** — outside assessment snapshot + tables
- **`docs/Engine-School-Lesson-Path-Outside-Assessment.md`** — Engine School vs verify (orthogonal to AIOM snapshot law)
- **`docs/Engine-School-Validation.md`** — lesson JSON validation (not truth-matrix)
