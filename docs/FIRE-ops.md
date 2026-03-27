# FIRE — ops (assessment §M)

CI/CD and verify pipeline contracts — satellite of **`docs/FIRE.md`**.

## M. CI/CD contracts (baseline vs strict)

**Baseline PR CI** (`.github/workflows/verify.yml`): **`pnpm verify:ci`** = **`pnpm assert:hard-gate`** + **`node scripts/assert-encoder-diff-prerequisites.mjs`** + **`pnpm verify:harsh`** + **`node scripts/enforce-release-strict-gates.mjs`**. **GitHub Actions** sets **`ALCHEMIST_STRICT_OFFSETS=1`** for pushes to **`main`** / **`release/*`** and for PRs **targeting** those branches — **`assert:hard-gate`** then **fails closed** without **`tools/sample_init.fxp`** and a successful **`validate-offsets.py`** run. **`develop`** and other branches keep best-effort HARD GATE unless you export **`ALCHEMIST_STRICT_OFFSETS=1`** locally. **`assert-encoder-diff-prerequisites`** fails in CI when **`serum-offset-map.ts`** / **`validate-offsets.py`** changed in the git range but the sample **`.fxp`** is missing (covers encoder edits on non-strict branches). Export-sensitive diffs still trigger **`REQUIRE_WASM=1`** via **`enforce-release-strict-gates.mjs`**. The workflow also runs **`IOM_ENFORCE_COVERAGE=1 pnpm igor:ci`** as a separate step. **Truth matrix** (human-readable): **`pnpm truth:matrix`** → **`docs/truth-matrix.md`**; machine slice: **`GET /api/health/truth-matrix`**. **Ops runtime truth endpoint:** **`GET /api/health/truth`** requires **`ALCHEMIST_OPS_TOKEN`** + header **`X-Ops-Token`** and returns dynamic triad/wasm/hard-gate/advisory posture + latest receipt pointer. Durable **`verify_post_summary`** JSON → **`.artifacts/verify/`** and **`artifacts/verify/`** (**gitignored**). That line includes **`wasmStatus`**, **`hardGateStrict`**, **`verifyLaneLabel`** (**`green_core`**), and **`releaseReadyFromSummary`** (stricter WASM + sample + strict env — **not** implied by **`exitCode: 0`** alone). **`pnpm health:audit`** prints the latest receipt; **`ALCHEMIST_RELEASE_AUDIT=1 pnpm health:audit`** fails if release posture is not met.

| Script / step | Fails when | Typical use |
|---------------|------------|-------------|
| **`pnpm verify:ci`** | Missing offset map / validate script; **`verify:harsh`** failure; or strict release gate failure when encoder/WASM paths changed | GitHub Actions **`Verify`** job |
| **`pnpm assert:hard-gate`** + **`ALCHEMIST_STRICT_OFFSETS=1`** | No **`sample_init.fxp`** or Python validation error | Release / encoder-critical pipelines |
| **`pnpm harshcheck`** | Same as **`verify:web`** (includes production **`next build`**) | Pre-merge / pre-release |
| **`pnpm predeploy`** | **`build:wasm`** fails or **`pkg/`** stub / missing WASM ( **`REQUIRE_WASM=1`** during assert ) | Before shipping browser **`.fxp`** |
| **`REQUIRE_WASM=1 pnpm assert:wasm`** | No **`fxp_encoder_bg.wasm`**, stub glue, or **`pkg/.stub`** marker | After **`build:wasm`** in deploy |

**Structured `soeHint`:** **`verify_post_summary`** keeps **`soeHint` as a string**. Offline / SIEM: **`parseLegacySoeHintMessage`** (**`packages/shared-engine/soe-hint-structured.ts`**) + **`pnpm soe:migrate`** produce JSONL — optional; does **not** change the verify line schema yet (**`docs/archive/alchemist-new-moves.html`**).

**Pre-merge (human):** Full **`pnpm harshcheck`** before merge if you used local **`ALCHEMIST_SELECTIVE_VERIFY=1`**; confirm **`iomCoverageScore`** = **1** on the CI summary line. **No** committed **`.git/hooks`** in-repo — install optional hooks locally if your team wants them.

---
