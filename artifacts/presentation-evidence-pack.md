# AIOM Presentation Evidence Pack

Generated: 2026-03-27T00:48:53.152Z
Git SHA: `862db0ec8c8a40790a25463a0adc6be153d81041`

## Executive Summary
- Governance posture: green_core (exitCode=0)
- AIOM integrity score: 0.92
- WASM truth: real / available
- PNH posture: degraded (status=warning)

## Metrics

| Metric | Value | Source |
|--------|-------|--------|
| Tests passed | 292 | verify_post_summary |
| Test files | 55 | verify_post_summary |
| IOM coverage | 1 | verify_post_summary |
| AIOM integrity | 0.92 | verify_post_summary |
| WASM export | available (real) | verify_post_summary |
| PNH status | warning | verify_post_summary / pnh-simulation-last |

## 5-line Integration Snippet
```ts
const triad = await fetch("http://127.0.0.1:3000/api/triad/deepseek", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
const triadJson = await triad.json();
const truth = await fetch("http://127.0.0.1:3000/api/health/truth", { headers: { "X-Ops-Token": process.env.ALCHEMIST_OPS_TOKEN ?? "" } });
const truthJson = await truth.json();
const receipt = JSON.parse(await fs.promises.readFile("artifacts/release-audit-receipt-latest.json", "utf8"));
```

## Demo Status Snapshot
# Demo Status

| Check | Status | Proof Source | Last Checked |
|-------|--------|--------------|--------------|
| HARD GATE | ⚠️ best_effort | verify_post_summary | 2026-03-27T00:28:52.177Z |
| WASM Export | ✅ real | assert:wasm / verify_post_summary | 2026-03-27T00:28:52.177Z |
| Triad Panel State | declared | verify_post_summary | 2026-03-27T00:28:52.177Z |
| Circuit Breaker | wired | packages/shared-engine/circuit-breaker.ts | 2026-03-27T00:28:52.177Z |
| Panelist DNA | present | packages/shared-engine/triad-panelist-system-prompt.ts | 2026-03-27T00:28:52.177Z |
| Stub Learning | disabled | packages/shared-engine/reality-signals-log.ts | 2026-03-27T00:28:52.177Z |
| PNH Immunity | ✅ pass | pnpm pnh:ghost -- --strict | 2026-03-27T00:28:52.177Z |
| Truth Matrix | ✅ generated | docs/truth-matrix.md | 2026-03-27T00:28:52.177Z |



