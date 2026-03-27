# Security policy — Alchemist / Vibe Projects

## Supported versions

| Area | Supported |
|------|-----------|
| Active development on **`main`** (or default branch) | Yes |
| Old tags / forks | Best-effort only |

## Reporting a vulnerability

**Please do not** file a **public** GitHub issue for an **undisclosed** security vulnerability (that can put users at risk).

1. **Contact the repository maintainer privately** (e.g. GitHub **Security Advisories** for the repo, or an email you publish for security contact).
2. Include: affected component (e.g. `apps/web-app`, `shared-engine`), reproduction steps, and impact if known.
3. Allow reasonable time for a fix before public disclosure.

If this repository is **private** or has **no** advisory channel yet, use your org’s internal security process and add a real contact here when you publish.

## Scope (typical)

- **In scope:** Authentication/session handling, injection in server routes, unsafe deserialization, secrets in client bundles, dependency alerts you can reproduce.
- **Out of scope / low priority:** Denial-of-service against local `pnpm dev`, theoretical issues without a path through shipped code, third-party plugin/DAW security (report to the vendor).

**Product note:** Shipped preset/triad paths are intended to use structured **`logEvent`** telemetry (see **`docs/FIRE.md`**). Features that deliberately **disable** audit logs for production inference would be a design concern — not part of the canonical codebase.

**Operational note:** `verify_post_summary` may include MON fields (`minimumOperatingNumber`, `minimumOperatingNumber117`, `minimumOperatingReady`) for risk triage. Treat MON as an auditable signal, not a replacement for vulnerability handling.

## After reporting

Maintainers should acknowledge receipt when possible and coordinate a fix and release note (or advisory) as appropriate.

---

*This is process guidance, not legal advice. Referenced from `docs/FIRE.md` §G and `docs/FIRESTARTER.md` §14. Last updated: 2026-03-27.*
