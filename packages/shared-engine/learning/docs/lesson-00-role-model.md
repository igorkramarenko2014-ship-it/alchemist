# Lesson 0 — Role model for Engine School lessons

This document is the **canonical quality bar** for every committed lesson under `corpus/**/*.json`. It matches **`schema/lesson.schema.json`** (`schemaVersion` **`1.0`**) and the operator flow in **`README.md`**.

## What a lesson is (and is not)

| A lesson **is** | A lesson **is not** |
|-------------------|---------------------|
| A **compressed logic atom**: style anchor → mapping tendencies → audible character → **causal** explanation | Marketing fluff, vague adjectives, or “this preset is cool” |
| **Abstract mapping grammar** (`mappings` keys + human-readable value strings). Keys become **`mappingKeys`** in the generated index for affinity / token overlap | Raw Serum byte values, authoritative `.fxp` claims, or offset-map edits |
| **Pack-level or archetype-level** distilled logic when possible (repeated design language) | A requirement to document one random preset unless it **defines** an archetype |

## The four layers (all required in spirit)

Every strong lesson must let a model answer: *“Given this desired sound, what control logic probably gets me there?”*

1. **Style identity (`style`)** — The **style class** (e.g. aggressive modern bass, glossy melodic pluck). Not a product slogan; one clear sonic world.
2. **Mapping tendencies (`mappings`)** — **Parameter families** and recurring zones (short amp envelope, open filter, heavy unison, etc.). Values are **strings** describing tendency, not a full parameter dump unless needed for teaching.
3. **Audible character (`character`)** — How it **sounds** to a human (≥ **20** chars per schema). Bridge from knobs to language.
4. **Causal reasoning (`causalReasoning`)** — **Why** those mappings produce that character (≥ **40** chars). This is the teaching payload.

Optional **`tags`** sharpen retrieval, deduping, and Phase 2 / Phase 3 overlap.

## Field contract (JSON)

| Field | Rule |
|-------|------|
| `schemaVersion` | **`"1.0"`** until the schema bumps |
| `id` | Stable unique id (e.g. `engine_school_role_model_v1`, `engine_school_lesson_002`) |
| `presetName` | Human label (≥ 2 chars). For archetype lessons: **pack + archetype**, not a single preset name unless that is the teaching unit |
| `style` | Non-empty style class string |
| `mappings` | Object, ≥ 1 key; values are typically **short prose** describing the family’s tendency |
| `character` | ≥ 20 chars, concrete sonic description |
| `causalReasoning` | ≥ 40 chars, explicit cause → audible effect chain |
| `tags` | Optional array of short tokens |
| `priorityMappingKeys` | **1–3** keys copied from `mappings` — the knobs that **most** define the archetype (decision layer) |
| `coreRules` | **2–3** minimal strings: irreducible cause→effect rules (compression; not a second full essay) |
| `contrastWith` | `{ lessonId, difference }` — explicit **why X ≠ Y** vs another committed lesson (`lessonId` must exist in `corpus/`) |

## Bad vs good (examples of failure)

**Bad:** “Dark wide bass, very cool, sounds huge.”  
**Good:** Style + which families (env/filter/unison/distortion) + *why* the transient reads aggressive and the mids stay controlled.

**Bad:** Only numeric literals with no story.  
**Good:** Numbers allowed in `mappings` values when they teach, but archetype lessons usually prefer **zones** (“short decay”, “moderate resonance”) until you intentionally teach a numeric anchor. See **`corpus/engine-school-role-model-v1.json`** (compact) and **`corpus/engine-school-lesson-002-wide-pad-evolution.json`** (large mapping surface) for archetype-level squeezes.

## Lesson 1 program

1. **Spec:** this file (**Lesson 0**).
2. **Worksheet:** `pack-archetype-extraction-sheet.md` (3-pass squeeze + table).
3. **Fingerprints:** `pack-fingerprints-tier-a.md` (one row per trusted pack; operator-filled after Pass 1).
4. **Gold lessons:** **`corpus/engine-school-role-model-v1.json`** (`engine_school_role_model_v1`) and **`corpus/engine-school-lesson-002-wide-pad-evolution.json`** (`engine_school_lesson_002`) — same framework, different data weight; clone for new archetypes.
5. **Scale:** more archetypes per pack → cross-pack meta-lessons → batch authoring (see `README.md` Phase 2 / 3).

## Trust tier (operator convention)

**Tier A — teaching canon:** high-trust, low-noise packs used to define vocabulary and causal patterns. Their recurring patterns deserve more weight later in prompt enrichment / corpus affinity **when those features are enabled** — still **no** gate or weight mutation from lessons alone.
