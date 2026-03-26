# IOM V5 — Architecture Assessment + Next Hacker Moves

**Source:** operator draft · **Cursor / rules:** see **`.cursor/rules/alchemist-iom-v5-next.mdc`**

> **Repo sync (implementation truth, not aspiration):**
> - **Panelist DNA (MOVE 1):** **Partial** — distinct emphasis lines live in **`apps/web-app/lib/triad-panelist-system-prompt.ts`** (lighter than the ATHENA/HERMES/HESTIA prose below; avoids heavy codename + “FM ratios” copy in-system-prompt — extend deliberately if product wants).
> - **Circuit breaker (MOVE 2):** **`TriadCircuitBreaker`** exists in **`shared-engine`**; **not** wired to **`/api/triad/*`** (doc sketch uses wrong export name **`AlchemistCircuitBreaker`**).
> - **Intent alignment / GL intake / auto pre-commit (MOVE 3–5):** **Not** shipped.
> - **CI IOM ghosts:** **`IOM_ENFORCE_COVERAGE=1 pnpm igor:ci`** on GitHub **Verify**; pre-commit sample: **`tools/git-hooks/pre-commit-iom.sample`** (manual install).

**Machine snapshot (typical):** run **`pnpm fire:sync`** for Vitest / Next block in **`FIRE.md`**.

---

## ARCHITECTURE ASSESSMENT (honest, no flattery)

### What you've built

This is no longer a vibe project. It is a typed, auditable, self-diagnosing
AI preset refinery with a structured soul layer. Inventory as of today:

**Pipeline (prod-grade):**
- NL prompt → validateTriadIntent (intent-hardener) → triad (3 panelists,
  parallel, keyed fetcher or stub) → Undercover + Slavic + legibility gates
  → scoreCandidates → ranked candidates → optional WASM .fxp export
- Surgical repair (performSurgicalRepair) on post-gate candidates
- Keyword tablebase short-circuit when prompt matches
- Taxonomy pool narrowing (≤200 → ≤8) with sparse rank; optional **`oversizeKeywordFallback`** + **`prompt`**

**IOM layer (genuinely rare):**
- Power manifest (igor-orchestrator-layer.ts) — typed inventory of shipped modules
- IOM pulse (iom-pulse.ts) — live schism detection + SOE merge
- Self-heal workflow (igor:heal → JSONL → igor:apply) — proposals without mutation
- Historical snapshots (iom:snapshot / iom:diff) — provenance-required audit trail
- CI coverage enforcement (IOM_ENFORCE_COVERAGE=1 igor:ci)
- Prometheus metrics (/api/metrics/iom) + Grafana dashboard
- Ops token-gated endpoints (/api/health/iom, /api/iom/dashboard)
- verify_post_summary now merges IOM schisms + verdict + SOE hint head

**Verification chain:**
- verify:ci = HARD GATE + verify:harsh + IOM coverage check
- harshcheck:wasm = full chain + real WASM assertion
- fire:sync auto-refreshes metrics block after green run
- Pre-commit hook available (tools/git-hooks/)

### What's actually missing (the honest gaps)

**Gap 1 — Panelist DNA (biggest leverage point)**
Panelists still receive the same system prompt. They clone each other.
The Slavic gate then has to work overtime to deduplicate what should never
have been duplicated. The fix is upstream: panelist-identity seeds in
fetcher system prompts so LLAMA biases toward timbral, DEEPSEEK toward
modulation complexity, QWEN toward saturation/texture. This is the highest
ROI move in the entire pipeline right now.

**Gap 2 — Prompt-to-preset alignment is still implicit**
You know if a candidate passed the gates. You don't know if it matched
the user's intent. A "dark growling bass" prompt that generates a bright
pad passes all gates perfectly. The alignment score doesn't exist yet.

**Gap 3 — Circuit breaker is shipped but not wired**
circuit-breaker.ts exists. It's not connected to /api/triad/* routes.
If DeepSeek has a bad 30 minutes, you have no automatic degradation.
Every run hits the timeout ceiling instead of failing fast.

**Gap 4 — Great Library is offline-only with no intake pipeline**
The merge contract is solid. The problem: there's no tooling to actually
build and maintain the library content. You have a beautiful river with
no water source.

**Gap 5 — IOM coverage enforcement is CI-only**
IOM_ENFORCE_COVERAGE=1 catches ghost modules in CI. But in Cursor,
a new shared-engine file can live unregistered for days before CI runs.
The pre-commit hook is available but not installed by default.

---

## TOP 5 NEXT HACKER MOVES

Ranked by: architectural leverage × canon compliance × shipping speed.
Every move stays within FIRE §E–§M contracts. Zero shadow governance.

---

### MOVE 1 (P0) — PANELIST DNA SEEDS
**"Stop deduplicating what you could have diversified"**

**What:** Per-fetcher system prompt identity seeds in
`triad-panelist-system-prompt.ts` ( **`apps/web-app/lib/`** — not `shared-engine`) that give each panelist
a distinct timbral/structural mandate.

**The seeds (proposed):**
```typescript
// packages/shared-engine/triad-panelist-system-prompt.ts  ← WRONG PATH in original; use apps/web-app/lib/
export const PANELIST_DNA: Record<Panelist, string> = {
  DEEPSEEK: `
    You are ATHENA — bias toward HARMONIC COMPLEXITY.
    Favor: rich oscillator stacking, detuned unison, complex FM ratios.
    Avoid: simple single-osc patches, dry unmodulated output.
    Your paramArray should have HIGH VARIANCE across osc/filter params.
  `,
  LLAMA: `
    You are HERMES — bias toward RHYTHMIC MOVEMENT.
    Favor: aggressive LFO modulation, envelope punch, sync/arp texture.
    Avoid: static sustained pads, low-movement presets.
    Your paramArray should have HIGH MODULATION index values.
  `,
  QWEN: `
    You are HESTIA — bias toward TIMBRAL TEXTURE.
    Favor: wavetable position sweeps, subtle saturation, noise layers.
    Avoid: clean digital patches, heavy distortion.
    Your paramArray should show GRADUAL SPECTRAL evolution.
  `
}
```

**Why elite:**
- Slavic gate drops from high-effort dedup to low-effort confirmation
- Candidate diversity increases before gates, not after
- Greek codename alignment is already in the telemetry (ATHENA/HERMES/HESTIA)
- Zero new infrastructure — just prompt diffs in existing fetcher routes
- Tests: add `triad-panelist-dna.test.ts` — verify each seed string is
  non-empty, distinct, doesn't contain forbidden DSP claims

**Compliance:** No gate overrides. No weight changes. Prompt is not law.
If a panelist ignores its DNA, gates handle the output normally.

**Ship time:** 3 hours + tests

---

### MOVE 2 (P0) — CIRCUIT BREAKER WIRING
**"Stop paying timeout tax on known-bad providers"**

**What:** Wire the existing circuit-breaker.ts into /api/triad/* routes.
Fast-fail open panelists. Return partial triad with iomPulse schism flag.

**The wiring:**
```typescript
// apps/web-app/app/api/triad/[panelist]/route.ts (enhance)
import { AlchemistCircuitBreaker } from '@alchemist/shared-engine';

const breaker = AlchemistCircuitBreaker.forPanelist(panelist);

if (breaker.isOpen()) {
  logEvent('circuit_breaker_skip', { panelist, state: 'open' });
  return Response.json(
    { candidates: [], meta: { circuitOpen: true } },
    { headers: { 'x-alchemist-triad-mode': 'circuit-open' } }
  );
}

try {
  const result = await fetchCandidates(/* ... */);
  breaker.recordSuccess();
  return result;
} catch (err) {
  breaker.recordFailure();
  throw err;
}
```

**Note:** Replace **`AlchemistCircuitBreaker`** with actual **`TriadCircuitBreaker`** / **`withTriadCircuitBreaker`** from **`packages/shared-engine/circuit-breaker.ts`** — design singleton or per-panelist instances for serverless (process memory).

**IOM schism tie-in:**
```typescript
// packages/shared-engine/iom-pulse.ts (extend detectSchisms)
const openBreakers = getOpenCircuitBreakers();
if (openBreakers.length > 0) {
  schisms.push({
    cellId: 'triad_velocity',
    severity: 'warning',
    issue: `Circuit open: ${openBreakers.join(', ')} — partial triad active`,
    suggestion: 'Check provider health. Run pnpm verify:keys.'
  });
}
```

**Why elite:**
- Converts 8-second timeout storms into instant fails
- iomPulse.schisms[] surfaces it immediately to ops
- /api/health already shows triadFullyLive — now it has a reason when false
- circuit-breaker.ts is already shipped and tested — this is wiring, not building

**Ship time:** 2 hours + schism test

---

### MOVE 3 (P1) — INTENT ALIGNMENT SCORE
**"Know if the output matched what was asked"**

**What:** Add `intentAlignmentScore` to `AICandidate` — a lightweight
heuristic (not an embedding model) that measures prompt→candidate alignment
using keyword overlap + category match + param distribution proximity.

**Pipeline integration:**
```typescript
// In scoreCandidates — after Slavic, before final ranking
candidates = candidates.map(c => ({
  ...c,
  intentAlignmentScore: scoreIntentAlignment(prompt, c, intentResult)
}));

// Weight into final sort: current score * 0.7 + intentAlignment * 0.3
```

**Why elite:**
- Closes the biggest invisible gap in the pipeline
- No embedding models, no external calls — pure TS, Vitest-testable
- Makes the ranking meaningful instead of gate-survival-based
- intentHardenerResult is already computed upstream — just thread it through

**Ship time:** 5 hours + tests

---

### MOVE 4 (P1) — GREAT LIBRARY INTAKE PIPELINE
**"Give the river a water source"**

**What:** A scriptable intake pipeline (`tools/gl-intake.mjs`) that takes
a directory of .fxp files or a JSON preset dump, validates each against
serum-offset-map.ts (HARD GATE), extracts metadata, and writes a
provenance-stamped batch JSON for mergeGreatLibraryIntoSoeSnapshot.

**Ship time:** 4 hours (Python validate bridge + JS intake script + tests)

---

### MOVE 5 (P2) — IOM COVERAGE PRE-COMMIT DEFAULT
**"Catch ghost modules before CI does"**

**What:** Make the pre-commit hook install automatically during `pnpm install`
via a `prepare` script. Add a lightweight `pnpm iom:ghost:check` that runs
fast (no full harshcheck) — just scans for unregistered shared-engine *.ts
files and prints a table.

**Ship time:** 2 hours

---

## PRIORITY MATRIX

| Move | Leverage | Risk | Time | Ship order |
|------|----------|------|------|-----------|
| 1. Panelist DNA | ★★★★★ | Low | 3h | This weekend |
| 2. Circuit breaker wiring | ★★★★★ | Low | 2h | This weekend |
| 3. Intent alignment score | ★★★★☆ | Low | 5h | Next sprint |
| 4. Great Library intake | ★★★★☆ | Low | 4h | Next sprint |
| 5. IOM pre-commit default | ★★★☆☆ | Low | 2h | Anytime |

**Moves 1 + 2 together:** one weekend, zero new infrastructure,
maximum leverage. The circuit breaker is already built. The DNA seeds
are just strings. Both have immediate measurable effects on candidate
quality and triad reliability.

---

## THE STATE OF THE ENGINE (one paragraph)

You went from "vibe project with good ideas" to "auditable AI refinery
with a self-diagnosing soul layer" in what looks like a few weeks of
focused vibe-coding. The verify chain is real. The IOM discipline is real.
The Prometheus metrics and Grafana dashboard are real. The thing that's
missing is not infrastructure — it's the last mile of intelligence:
panelists that actually disagree with each other, a pipeline that knows
if its output matched the question, and a library that has actual content.
Those are the three gaps. Moves 1–4 close them.
The fortress is built. Now stock it.

---

## IOM COMMIT CONVENTION (reminder)

```
iom: add panelist-dna — ATHENA/HERMES/HESTIA timbral seeds
iom: wire circuit-breaker to /api/triad/* routes
iom(test): intent-alignment score baseline
iom: gl-intake pipeline — HARD GATE validated batch intake
iom(sync): auto-install pre-commit ghost check
```

---

_Canon (HARD GATE, verify, triad wiring) overrides IOM ethos. Always._
_IOM overrides nothing. It aligns engine + assistant._
_pnpm igor:sync · pnpm verify:harsh · pnpm iom:status_
