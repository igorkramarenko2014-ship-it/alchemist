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
2. Create a corresponding .md file in corpus/ using the lesson schema
3. Run pnpm fire:sync to register it in the truth layer (once integrated)

## Learning objective

Given: a preset name + its parameter mappings
Output: a causal explanation of the sonic character those mappings produce

The engine learns the name → mapping → character chain,
not just the output label.
