# Engine Learning Corpus

Pre-production AI learning material for shared-engine pattern recognition.
This folder is not a module. It contains no runtime logic.
It is consumed as training input — structured examples that teach the engine
why certain configurations produce certain results.

## Structure

- `presets/` — raw preset files organized by style subfolder
- `corpus/` — annotated lesson documents (one per preset or preset group)
- `schema/` — formal definition of a lesson document

## How to add a lesson

1. Drop the preset file into presets/<style>/
2. Create a corresponding `.json` (or `.md`) lesson in `corpus/` aligned with `schema/lesson.schema.json`
3. When the abstract lesson is saved, drop raw pack material from the tree (see below)

## Forgetting raw presets (keep logic only)

After lessons capture **mappings + causal reasoning**, strip binaries and pack-only media so the repo holds **structured lessons**, not distributable preset files:

```bash
# preview
LEARNING_FORGET_DRY_RUN=1 pnpm learning:forget-presets

# delete under packages/shared-engine/learning only
pnpm learning:forget-presets
```

Removes: `.fxp` / `.fxb` (and a few related extensions), common image formats, and noisy `IMPORTANT*.txt` / `*ВАЖНО*.txt` pack readmes. **Keeps:** `corpus/*.json`, lesson `.md`, `schema/`, this `README.md`, `.gitkeep`, and any `.ts` helpers in this folder. Empty pack subfolders under `presets/` or `corpus/` are removed; top-level `presets/` and `corpus/` stay with `.gitkeep`.

Operators are responsible for lawful use of any source material; this command is hygiene for the **learning tree only** — it does not change encoder, web, or truth artifacts.

## Learning objective

Given: a preset name + its parameter mappings
Output: a causal explanation of the sonic character those mappings produce

The engine learns the name → mapping → character chain,
not just the output label.
