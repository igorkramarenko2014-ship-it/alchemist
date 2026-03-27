# Critical Fix — Keynote Automation Reliability

## Status

Resolved in presentation automation pipeline with explicit diagnostics and fallback behavior.

## Incident Summary

`pnpm presentation:keynote` failed in multiple macOS environments with two classes of errors:

- AppleScript parser error (`-2741`) when generated `.scpt` contained dictionary-sensitive expressions.
- JXA app-resolution error (`-2700`) when Keynote was not discoverable in the current automation session.

This blocked automatic deck creation while evidence artifacts were otherwise generated correctly.

## Root Cause

1. **Parser fragility:** generated AppleScript relied on terms (`default title item`, localized parser surface) that are theme/dictionary-sensitive.
2. **App resolution:** Keynote not available to the automation runtime (`Application("Keynote")` / bundle lookup failure), often due to install/state/permissions mismatch.

## Fix Applied

Presentation automation now follows a hardened path:

1. Build artifacts first (always):
   - `presentation-evidence-pack.json|.md`
   - `pitch-deck.md`
   - Keynote automation script artifact
2. Probe Keynote availability via JXA bundle ID.
3. If probe fails, try `open -a Keynote`.
4. Retry automation after short delay.
5. If still unavailable, exit with explicit operator guidance (diagnostic commands), not silent failure.

## Operator Runbook

From repo root:

```bash
pnpm presentation:keynote
```

If it fails with Keynote unavailable, run:

```bash
mdfind "kMDItemCFBundleIdentifier == \"com.apple.iWork.Keynote\""
osascript -l JavaScript -e 'Application(\"com.apple.iWork.Keynote\").activate()'
```

Then ensure macOS permissions:

- **System Settings → Privacy & Security → Automation**
- Allow your terminal app to control **Keynote**

## Guarantees After Fix

- Evidence and pitch artifacts are always produced.
- Keynote automation failures are explicit and actionable.
- No hidden retries or silent state mutation.

## Out of Scope

- No UI redesign.
- No changes to inference/gates/weights.
- No advisory-layer privilege escalation.

