# Cursor habits — copy into **User Rules** (all projects)

Paste the block below into **Cursor → Settings → Rules → User Rules** (or **Cursor Settings → General → Rules for AI**) so behavior applies **in every workspace**, not only the Alchemist monorepo.

````markdown
## Language

- Default assistant replies in **English**.
- If I write in Russian or Ukrainian, mirror that language for that message when it improves rapport.

## Git: commit + push after “meta” edits

When you finish edits that touch **only or mainly** project meta — e.g. `.cursor/` (rules, skills), `.cursorrules`, `AGENTS.md`, `README` policy sections, or project brain/orientation docs — **in the same turn**:

1. If the repo has `scripts/git-save.mjs` (Alchemist): from monorepo root run  
   `node scripts/git-save.mjs "type(scope): short English summary"`  
   with permissions needed for git + network.
2. Otherwise: from `git rev-parse --show-toplevel`, run  
   `git add -A && git commit -m "chore: …" && git push`  
   (skip commit if nothing staged; never commit `.env` or secrets — warn me instead).

When I say **cmt**, **psh**, **git-save**, or **commit and push**, do the same immediately with a clear English message.

Do **not** commit if I explicitly say not to.

## Data generation (optional — Alchemist / heavy JSON)

- For **large** JSON, fixtures, seed tables, CSV→JSON, or corpus audits: prefer **local Python** scripts under **`~/alchemist-tools/`** (run on your machine, **zero LLM tokens** for the blob) instead of pasting megabytes into chat. Full policy: **`.cursor/rules/alchemist-python-economy.mdc`**.
- **Do not** confuse with **in-repo** **`tools/validate-offsets.py`** (Serum **HARD GATE**) or shipped **`pnpm learning:*`** pipelines (Node) — those stay as documented.
````

**Alchemist note:** This repo also ships the same logic as **`.cursor/rules/alchemist-git-save-after-meta.mdc`** (`alwaysApply: true`) when you open the **Vibe Projects** root. User Rules duplicate the habit for **other** repositories. For **Python token economy**, mirror **`.cursor/rules/alchemist-python-economy.mdc`** in User Rules if you want the same habit everywhere.
