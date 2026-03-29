# Learning fitness roadmap — implementation prompt (Alchemist)

**Purpose:** Single place for fitness v1→v3, file targets, tests, AIOM/Taste follow-ons, and **acceptance criteria**.  
**Canon:** Engine School + corpus affinity stay **advisory** and **ordering-only** on survivors — no gate mutations, no Slavic/Undercover threshold edits, **HARD GATE** untouched. See **`docs/Engine-School-Validation.md`**, **`docs/FIRE.md`**.

**Token economy:** Bulk generated data (large JSON, batch transforms) → **local Python** **`~/alchemist-tools/`** per **`.cursor/rules/alchemist-python-economy.mdc`** — **no** extra LLM spend; keep shipped **`pnpm learning:*`** aggregators in Node.

**Existing substrate (already shipped):** `engine_school_influence`, `triadSessionId`, JSONL telemetry shards, `learning:aggregate-telemetry`, optional `fitnessScore` merged into `learning-index.json`, Phase 3 fitness-aware corpus affinity in **`compute-corpus-affinity.ts`** / **`score.ts`**.

---

## 1. Fitness algorithm: v1 → v3

### v1: survival fitness

**Goal:** Real, simple, hard-to-game fitness from server-observable facts.

**Signals (conceptual):**

- Lesson was selected  
- Candidates were produced  
- Candidates passed `isValidCandidate`  
- Best score / mean score from `engine_school_influence`  
- Unique `triadSessionId`  

**Per lesson (rolling window):**

```text
usageRate = uniqueTriadSessionsWithLesson
validRate = validCandidatesProduced / totalCandidatesProduced
qualityScore = mean(bestScore)

fitnessV1 =
  0.45 * validRate +
  0.35 * qualityScore +
  0.20 * logScaledUsageRate
```

**Guardrails:**

- Minimum sample threshold (e.g. **20** sessions) before “trusted”  
- Below threshold: `fitnessConfidence = low`  
- Do **not** let missing data default to high fitness  

### v2: outcome-lift fitness

**Goal:** Measure whether lessons improve ordering, not only survival.

**Additional `score_candidates` telemetry (conceptual):**

- `corpusAffinityOrderChanged` (already exists — ensure wired consistently)  
- `topCandidateScoreBefore` / `topCandidateScoreAfter`  
- `topCandidatePanelistBefore` / `topCandidatePanelistAfter`  
- `survivorCount`  

**Formula:**

```text
orderLift = % sessions where lesson-informed rerank changed ordering
scoreLift = mean(topCandidateScoreAfter - topCandidateScoreBefore)
survivorLift = mean(survivorCount_with_lesson_delta)  # define precisely in implementation

fitnessV2 =
  0.30 * validRate +
  0.25 * qualityScore +
  0.20 * normalizedScoreLift +
  0.15 * normalizedOrderLift +
  0.10 * logScaledUsageRate
```

### v3: trusted weighted fitness

**Add:** cluster rollups, recency decay, confidence weighting, deprecation signals.

```text
fitnessRaw =
  0.25 * validRate +
  0.20 * qualityScore +
  0.20 * normalizedScoreLift +
  0.15 * normalizedOrderLift +
  0.10 * clusterConsistency +
  0.10 * recencyWeightedUsage

confidence = clamp(sampleCount / 100, 0, 1)

fitnessV3 = fitnessRaw * confidence
```

**Runtime (conceptual):**

- Expose `lessonFitnessScore`, `clusterFitnessScore`, `fitnessConfidence`  
- Phase 3 effective weight (example — tune in code review):

```text
effectiveCorpusWeight =
  baseWeight * (0.75 + 0.5 * meanSelectedLessonFitness)
```

Bound (example): min **0.05**, max **0.15** — must stay advisory.

---

## 2. North-star and secondary metrics

**North star:**

```text
candidateSuccessRate =
  % of sessions where at least one lesson-influenced candidate
  survives validation and finishes as top-ranked survivor
```

**Secondary:** `meanBestScore`, `orderChangeRate`, `clusterHitRate`, `fitnessConfidence`.

**AIOM:** Add optional non-authoritative **`learningOutcomes`** block (integrity vs outcome stays separate).

---

## 3. File-level plan (priority order)

| Priority | File | Change |
|----------|------|--------|
| P0 | `packages/shared-engine/learning/scripts/aggregate-learning-telemetry.mjs` | Real fitness engine: v1 first; sample counts; confidence; per-lesson + per-cluster summaries; `artifacts/learning-fitness-report.json` schema bump as needed |
| P0 | `packages/shared-engine/learning/scripts/build-learning-index.mjs` | Merge `fitnessScore`, `fitnessConfidence`, `sampleCount`, `clusterFitnessScore`; compact only; no raw telemetry |
| P0 | `packages/shared-engine/learning/compute-corpus-affinity.ts` | Fitness-aware scaling with bounds; respect low confidence |
| P1 | `packages/shared-engine/score.ts` | Richer `score_candidates` telemetry (pre/post top candidate, order changed, lesson ids/clusters when present); **no** gate math edits |
| P1 | `apps/web-app/**/api/triad/*` | Extend `engine_school_influence` payload: session id, selected lessons/clusters, counts, scores, panelist |
| P1 | `packages/shared-engine/learning/select-lessons-for-prompt.ts` (+ note in `build-learning-context.ts`) | **Shipped:** sort prefers cluster → priorityMappingKeys → coreRules → antiPatternCount; max 1–2 lessons default |
| P2 | Truth / AIOM artifacts | **Shipped:** `learningOutcomes` in **`artifacts/truth-matrix.json`** + **`docs/fire-metrics.json`** (schema **3**) — **non-authoritative** |
| P2 | Taste module | Confidence band for effective weight; staleness/drift metadata in index |

---

## 4. Suggested report shape (aggregator output)

Illustrative — finalize against schema validators in repo:

```json
{
  "aggregationVersion": 3,
  "generatedAtUtc": "...",
  "window": { "days": 30 },
  "lessons": [
    {
      "lessonId": "engine_school_role_model_v1",
      "sampleCount": 84,
      "validRate": 0.71,
      "meanBestScore": 0.88,
      "fitnessScore": 0.79,
      "fitnessConfidence": "high",
      "cluster": "bass_transient_punch"
    }
  ],
  "clusters": [
    {
      "cluster": "bass_transient_punch",
      "sampleCount": 130,
      "clusterFitnessScore": 0.76
    }
  ]
}
```

---

## 5. Tests to add (Vitest)

| Test file | Assert |
|-----------|--------|
| `packages/shared-engine/tests/learning-fitness-aggregation.test.ts` | Low sample → low confidence; missing telemetry → no inflated fitness; deterministic aggregation |
| `packages/shared-engine/tests/learning-index-fitness-merge.test.ts` | Index merges compact fitness when report exists; graceful without report; no telemetry leak |
| `packages/shared-engine/tests/corpus-affinity-fitness-weighting.test.ts` | Higher fitness → stronger ordering nudge within bounds; never promotes non-survivors |
| `apps/web-app/__tests__/triad-learning-telemetry.test.ts` | `triadSessionId` + stable `engine_school_influence` shape |
| `packages/shared-engine/tests/learning-context-selection.test.ts` | Cluster / priority / coreRules / antiPatterns affect selection ranking |

---

## 6. AIOM optional block (non-authoritative)

```json
"learningOutcomes": {
  "candidateSuccessRate": 0.78,
  "meanBestScore": 0.89,
  "corpusAffinityOrderChangeRate": 0.21,
  "tasteAffinityOrderChangeRate": 0.11
}
```

**Rules:** Separate from `integrityStatus`; does not set release readiness; label as quality trend.

---

## 7. Taste Corpus follow-ons

- Parity confidence model with lessons: `tasteClusterConfidence`  
- Variable `tasteEffectiveWeight` in a safe band (e.g. **0.03–0.08**), not fixed **0.06** forever  
- Drift / staleness: rebuild age metadata in `taste-index.json` + checks in `taste:validate` or ops script  

---

## 8. Ownership model (docs mental map)

- **Triad + gates** = execution  
- **Engine School + Taste** = priors  
- **AIOM** = measurement  
- **FIRE** = contract surface  

---

## 9. Implementation sequence (strict order)

1. Telemetry aggregation authoritative for fitness (v1 + confidence + thresholds)  
2. Merge trusted fitness into `learning-index.json`  
3. Fitness/confidence in Phase 3 weighting (`compute-corpus-affinity` + `score.ts` telemetry only as needed)  
4. Outcome telemetry on `score_candidates` (v2 inputs)  
5. ~~Optional AIOM `learningOutcomes` block~~ **done** (truth matrix + fire-metrics, schema 3)  
6. Drift/staleness for learning + taste indexes (**stalenessDays** in affinity weighting shipped)  

---

## 10. Acceptance criteria (global)

- [x] `pnpm learning:verify` and `pnpm verify:harsh` stay green  
- [x] No changes to Slavic cosine / Dice / legibility thresholds without explicit product sign-off  
- [x] No blend weight changes via telemetry; priors remain advisory rerank only  
- [x] `igor-power-cells.json` not silently edited — use `igor:heal` → `igor:apply`  
- [x] New report fields versioned (`aggregationVersion` / schema) with validator updates if applicable  

---

## 11. Blunt verdict

The repo already proves **validity** and **auditability**. The next hill is **trusted evidence that learning improves results** — without turning priors into shadow governance.

When you are ready to execute in Cursor, use **§3 + §5 + §9** as the checklist; start with **`aggregate-learning-telemetry.mjs`** and **`build-learning-index.mjs`**.
