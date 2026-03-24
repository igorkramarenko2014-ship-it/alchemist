# AGENTS.md — for coding assistants

**Repo:** Alchemist monorepo (Next.js web-app, packages, WASM encoder, `vst/` slice).

## Read first

1. **[`docs/FIRESTARTER.md`](docs/FIRESTARTER.md)** — **recovery bible** / full orientation; **Doc logic** (vs FIRE); **Appendix A** workflow; **Appendix B** INIT; **Appendix C** optional agent checklist (transparent triad, **`pnpm check:transparent`**); **Appendix D** Aji notes  
2. **[`docs/FIRE.md`](docs/FIRE.md)** — **lightweight** outside assessment + §E–§L; machine metrics via **`pnpm fire:sync`** (**`ALCHEMIST:FIRE_METRICS`** HTML comments)  
3. **[`.cursorrules`](.cursorrules)** (repo root) — compressed context  
4. **[`.cursor/rules/alchemist-brief.mdc`](.cursor/rules/alchemist-brief.mdc)** — HARD GATE, build order, triad weights  
4b. **[`.cursor/rules/alchemist-security-posture.mdc`](.cursor/rules/alchemist-security-posture.mdc)** — **always-on** security posture: offsets, env keys, triad stub/prod parity, WASM integrity, LLM trust boundaries, verification chain, thinking order  
4c. **[`.cursor/rules/alchemist-healthy-ai-environment.mdc`](.cursor/rules/alchemist-healthy-ai-environment.mdc)** — **always-on** healthy AI ops: **law vs model**, honest capability / no shadow governance, provider & data hygiene, humble heuristics (DNA / intent alignment), human agency (**`igor:apply`**, release)  
5. **[`.cursor/rules/alchemist-dsp-vs-ts-gates.mdc`](.cursor/rules/alchemist-dsp-vs-ts-gates.mdc)** — Undercover/Slavic = TS gates, not VST DSP  
6. **[`.cursor/rules/alchemist-quality.mdc`](.cursor/rules/alchemist-quality.mdc)** — scoped edit checklist (HARD GATE, triad, scripts)  
7. **[`.cursor/rules/alchemist-role-mission.mdc`](.cursor/rules/alchemist-role-mission.mdc)** — always-on **Lead Architect** role, mission, **`/plan` / `/fix` / `/refactor` / `/audit`** overrides (align with Cursor user rules)  
8. **[`.cursor/rules/alchemist-inner-circle-default.mdc`](.cursor/rules/alchemist-inner-circle-default.mdc)** — **always-on** default Cursor chat tone (**English** default; peer habits from **`.cursor/skills/inner-circle-voice/`**) — **after** canon; **not** HARD GATE / verify / gate facts  
8a. **[`docs/inner-circle-agent.md`](docs/inner-circle-agent.md)** — **full** inner-circle prompt (RU/UA/EN, feedback philosophy, teaching variant) + **Canon FIREWALL**; **`truth first → task second → tone third`** — tone layer only; **HARD GATE** still wins  
8b. **[`.cursor/rules/alchemist-git-save-after-meta.mdc`](.cursor/rules/alchemist-git-save-after-meta.mdc)** — **always-on** commit+push after **`.cursor/`** / brain / `AGENTS` edits or when user says **cmt/psh** (`node scripts/git-save.mjs`); **never** commit secrets  
8c. **[`docs/cursor-universal-habits.md`](docs/cursor-universal-habits.md)** — copy-paste for **Cursor User Rules** (same habits on **all** projects)  
8d. **[`.cursor/rules/alchemist-apex-orchestrator.mdc`](.cursor/rules/alchemist-apex-orchestrator.mdc)** — **§9c** Digital Igor / Apex Alchemist mercury-engine stance; **after** brief / security / dsp-vs-ts / inner-circle  
8d2. **[`.cursor/rules/alchemist-engine-fusion-communication.mdc`](.cursor/rules/alchemist-engine-fusion-communication.mdc)** + **[`.cursor/skills/alchemist-engine-fusion/SKILL.md`](.cursor/skills/alchemist-engine-fusion/SKILL.md)** — triad-angle + SOE-style status in chat (after canon); **not** runtime triad execution  
8e. **`igor-orchestrator-layer.ts`** + **`igor-orchestrator-meta.json`** + **`igor-power-cells.json`** → **`pnpm igor:sync`** writes **`igor-orchestrator-packages.gen.ts`** + **`igor-orchestrator-cells.gen.ts`**; **`getIgorOrchestratorManifest()`**; **`GET /api/health`** → **`igorOrchestrator`** (map only — not gate law)  
8f. **[`docs/iom.md`](docs/iom.md)** + **[`.cursor/rules/alchemist-iom.mdc`](.cursor/rules/alchemist-iom.mdc)** — **IOM** (Igor Orchestration Module): **§9c + §9d** under one name, canon firewall, growth protocol; sync script enforces **`IOM_CELL_MAX`** + artifact paths on disk  
8f2. **[`docs/iom-v5-next-moves.md`](docs/iom-v5-next-moves.md)** + **[`.cursor/rules/alchemist-iom-v5-next.mdc`](.cursor/rules/alchemist-iom-v5-next.mdc)** — IOM V5 backlog (DNA / breaker / alignment / GL / pre-commit); **enable rule** when planning those moves  
9. **[`docs/brain.md`](docs/brain.md)** — opening **Doc map** table; **§14** human-readable map (incl. RU); **§9a–§9c** (**brain-fusion** + soul + Apex / IOM). **[`docs/brain-plus.md`](docs/brain-plus.md)** — metrics shell for external review  
10. **[`.cursor/rules/alchemist-aji-fluidic.mdc`](.cursor/rules/alchemist-aji-fluidic.mdc)** — optional **OpenCV + OSC** “Lava–Aji” bridge (**`research/lava-aji-bridge/`**) — **not** TS triad/gates; see **`alchemist-dsp-vs-ts-gates.mdc`**  
11. **[`LEGAL.md`](LEGAL.md)** — not legal advice; trademarks (Serum / Xfer), AI provider ToS, telemetry, warranty, consumer-product gaps  
12. **[`PRIVACY.md`](PRIVACY.md)** — draft privacy template (fill before public beta)  
13. **[`SECURITY.md`](SECURITY.md)** — vulnerability reporting (no public disclosure for active issues)  

## Hard rules

- **Healthy AI environment** — TS gates + HARD GATE are **law**; triad LLMs produce **candidates** only. No shadow governance, no overstated “AI decides” copy over code. Provider ToS, keys, and **`PRIVACY.md`** before public beta — see **`alchemist-healthy-ai-environment.mdc`**.  
- **No** encoder / `.fxp` / authoritative `SerumState` values without validated **`packages/fxp-encoder/serum-offset-map.ts`** and **`tools/validate-offsets.py`** on a real Serum `.fxp`.  
- **Browser export** needs wasm-pack output in **`packages/fxp-encoder/pkg/`** (`pnpm run build:wasm` with Rust). Health: **`GET /api/health/wasm`**. CI/deploy: **`pnpm assert:wasm`** (same checks on disk); **`REQUIRE_WASM=1`** fails closed if stub/missing. See **`docs/FIRESTARTER.md` §10**, **`docs/FIRE.md` §C / §E1.17**.  
- **`shared-types`** is schema source of truth; after edits run **`pnpm --filter @alchemist/shared-types build`** (or **`pnpm harshcheck`**).  
- Open workspace **repo root** *Vibe Projects*, not only **`vst/`**, when editing `apps/` or `packages/`.

## Commands

```bash
pnpm install
pnpm alc:doctor       # NOT pnpm doctor
pnpm env:check        # apps/web-app/.env.local Groq line format (KEY=value, not bare gsk_)
# Optional SOE → GET /api/health iomPulse: ALCHEMIST_SOE_MEAN_PANELIST_MS + ALCHEMIST_SOE_TRIAD_FAILURE_RATE + ALCHEMIST_SOE_GATE_DROP_RATE (0–1); optional ALCHEMIST_SOE_MEAN_RUN_MS, ALCHEMIST_SOE_STUB_RUN_FRACTION — see apps/web-app/lib/soe-snapshot-from-env.ts
pnpm check:ready      # env:check + verify:harsh — quick “OK to dev?” before pnpm dev
pnpm verify:keys      # live Groq / DeepSeek / Qwen probe (.env.local; Qwen URL/model from QWEN_BASE_URL; no secrets printed)
pnpm test:real-gates  # gate calibration vs live triad routes → stderr calibration_*; local tools/gate-calibration-output.json (gitignored)
pnpm dev              # or pnpm dev:web
pnpm harshcheck       # pre-ship (spell: harshcheck not harshchek)
pnpm harshcheck:wasm  # harshcheck + REQUIRE_WASM=1 assert:wasm — before browser .fxp export (needs pnpm build:wasm)
pnpm verify:harsh:wasm # verify:harsh + REQUIRE_WASM assert (faster; no next build)
pnpm harshcheck:fire  # harshcheck + ALCHEMIST_FIRE_SYNC=1 (refresh FIRE / brain-plus metrics after green)
pnpm verify:ci        # assert:hard-gate + verify:harsh (matches default GitHub Verify job; CI also runs IOM_ENFORCE_COVERAGE=1 igor:ci)
pnpm verify:harsh     # faster: no next build
pnpm verify:harsh:fire # verify:harsh + ALCHEMIST_FIRE_SYNC=1 after green
pnpm predeploy        # build:wasm + REQUIRE_WASM assert:wasm — before shipping browser .fxp
pnpm soe:migrate      # optional: legacy SOE lines → structured JSONL (see packages/shared-engine/soe-hint-structured.ts)
pnpm test:engine:grep -- --grep <pattern>  # shared-engine Vitest only — fast iteration (see brain.md §9c.1)
pnpm web:dev:fresh    # stale Next / shared-engine
pnpm app:repair       # alias → web:dev:fresh (corrupt .next / dev 404 on /)
pnpm web:rebuild      # before next start after package changes
pnpm docs:list        # list first-party markdown
pnpm perf:boss        # shared-engine perf sweep (perf_boss_* JSON on stderr)
pnpm check:transparent # denylist scan: no shadow / KGB / amnesia patterns in shared-engine .ts
pnpm build:wasm        # Rust + wasm-pack → browser Export .fxp (needs rustup + wasm32-unknown-unknown)
pnpm vst:observe       # CLI: fxp-encoder vst-bridge + vst_observer IOM (HARD GATE); see docs/vst-wrapper.md
pnpm vst:observe:gate  # validate-offsets hook only
pnpm vst:daemon        # fxp-encoder Rust file watcher (optional)
pnpm build:vst         # copy JUCE .vst3 when CMake build exists (apps/vst-wrapper)
pnpm fire:sync         # after green verify: refresh docs/FIRE.md Vitest + Next metrics block
pnpm iom:status        # offline IOM Markdown + engine scale heuristic (descriptive; not valuation advice)
pnpm estimate          # same LOC/heuristic as IOM; harshcheck verify_post_summary includes iomEngineHeuristic
pnpm assert:wasm       # pkg/ present + non-stub glue; REQUIRE_WASM=1 for release-style fail-closed
pnpm brain:sync        # docs/brain.md §9a JSON → brain-fusion-calibration.gen.ts
pnpm igor:sync         # workspace packages + meta → igor-orchestrator-packages.gen.ts
pnpm igor:heal         # ghost .ts vs igor-power-cells.json → tools/iom-proposals.jsonl (gitignored) + stderr
pnpm igor:apply        # interactive y/n append proposals → igor-power-cells.json; then pnpm igor:sync
```

See **[`RUN.txt`](RUN.txt)** for a copy-paste one-liner.

## Composer prompt packs (browser)

**[`docs/alchemist-cursor-prompts.html`](docs/alchemist-cursor-prompts.html)** · **[`docs/alchemist-high-efficiency-prompts.html`](docs/alchemist-high-efficiency-prompts.html)** · **[`docs/alchemist-cpc-execution-plan.html`](docs/alchemist-cpc-execution-plan.html)** · **[`docs/alchemist-full-unblock-plan.html`](docs/alchemist-full-unblock-plan.html)** · **[`docs/alchemist-new-moves.html`](docs/alchemist-new-moves.html)** · **[`docs/alchemist-tablebase-seeding.html`](docs/alchemist-tablebase-seeding.html)** — index **`docs/FIRESTARTER.md` §12**; **next moves** summary **`docs/FIRE.md`** Assessment snapshot.

## UI / Mercury

**[`apps/web-app/docs/MERCURY-BALL.md`](apps/web-app/docs/MERCURY-BALL.md)**
