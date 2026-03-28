# Pack archetype extraction sheet

Use this for **each** trusted pack before writing committed `corpus/*.json`. Goal: **compress trusted packs into reusable logic atoms** — not bytes, not vague adjectives.

See **`lesson-00-role-model.md`** for the four layers and quality bar.

---

## Three-pass squeeze

### Pass 1 — Pack fingerprint (one page per pack)

Output: **one summary** covering:

- Dominant styles (2–5 phrases)
- Most recurring **tags** (style descriptors)
- Recurring **parameter families** (env / filter / osc / FX / unison / modulation)
- Recurring **character words** (glassy, rubbery, harsh, warm, …)
- What this pack does **unusually well** vs generic libraries

### Pass 2 — Archetype extraction

Inside the pack, cluster presets into **2–5 archetypes** (e.g. aggressive bass, clean pluck, ambient pad). For each archetype, draft:

- Archetype name
- Style line
- Mapping families (control grammar)
- Character line
- Causal paragraph
- **Confidence** (high / medium / low) and **representative preset names** (examples only; lesson JSON stays abstract)

### Pass 3 — Cross-pack synthesis

Across the **three** Tier-A packs, capture:

- Shared style patterns
- Conflicting approaches (same goal, different grammar)
- Strongest recurring **cause → effect** rules

Output: notes for **elite meta-lessons** (future JSON) and AIOM priors — still **committed JSON + schema**, not shadow governance.

---

## Master table (copy per pack)

| Field | Notes |
|-------|--------|
| **Pack name** | As labeled on disk / license (operator responsibility) |
| **Archetype name** | Short internal label |
| **Style** | Style class (Lesson 0) |
| **Tags** | Token list for retrieval |
| **Mapping families** | Bullet list: env, filter, osc stack, unison, distortion, FX, modulation |
| **Character** | Audible description (human) |
| **Causal reasoning** | Why those mappings → that sound |
| **Confidence** | high / medium / low |
| **Representative presets** | Example names only |

---

## JSON handoff

When an archetype row is stable, translate one row into **`corpus/<id>.json`** using **`lesson.schema.json`**. Use **`pnpm learning:verify`** before commit.

**Mapping keys:** Prefer stable family names as object keys (`ampEnv`, `filter`, `oscillators`, `unison`, `distortionFx`, `modulation`, …) with **string** values describing tendency so **`mappingKeys`** stay meaningful for Phase 3 affinity.
