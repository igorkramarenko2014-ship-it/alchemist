# Persona Validation

## CI Contract
Personas are validated via `pnpm personas:verify`.
This script is integrated into `pnpm verify:harsh`.

## Verification Steps
1. JSON Schema validation (persona.schema.json).
2. Exact logic count (17).
3. Exact command count (117).
4. Logic ID reference integrity.
5. Global ID uniqueness.
6. Self-contrast prevention.

## Output
Failure in any step exits with code 1 and blocks the Alchemist release pipeline.
Success outputs: `{"status":"ok","validatedFiles":N}`.
