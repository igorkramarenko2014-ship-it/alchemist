# Legal notices (Alchemist / Vibe Projects)

**This is not legal advice.** For distribution, compliance, or commercial use, consult qualified counsel in your jurisdiction.

---

## Software license

See the repository root **`LICENSE`** file. The root **`package.json`** declares SPDX **`UNLICENSED`** while the project remains **private**; change both if you adopt a public license (e.g. MIT, Apache-2.0).

---

## Third-party trademarks

**Serum** and related marks are trademarks of their respective owners (e.g. **Xfer Records, Inc.**). This project is **not** affiliated with or endorsed by Xfer Records. References to Serum, `.fxp`, and preset formats describe **interoperability** and user-generated content, not ownership of third-party IP.

---

## AI providers and APIs

Triad and other features may call **external LLM or API providers**. You are responsible for:

- Their **terms of use**, **acceptable use**, and **privacy** policies  
- **Keys**, **billing**, and **data** you send to those services  
- **Retention** and **logging** choices in your deployment  

Nothing in this repository grants a license to third-party models or services.

---

## Presets, audio, and exports

Generated candidates and exported files (e.g. **`.fxp`**) are **tools and outputs at your own risk**. You are responsible for:

- **Compatibility** with your DAW, plugins, and OS  
- **Rights** in prompts, samples, and derivative works  
- **Safety** and **loudness** in professional audio workflows  

The **HARD GATE** (`serum-offset-map.ts` + `validate-offsets.py`) is an **engineering** requirement for byte-accurate encoding — not a legal warranty.

---

## Telemetry

Operational telemetry (e.g. triad timing, governance scores, optional **`preset_shared`**) is described in **`docs/FIRE.md`** / **`docs/FIRESTARTER.md`**. **Share URLs** (**`/presets/[slug]`**) can expose whatever fields you put in **`SharedPreset`** (e.g. prompt text) to anyone who receives the link — disclose that in your product copy and **`PRIVACY.md`**. Configure collection, retention, and notices to match **your** product and **applicable law** (e.g. GDPR, CCPA) if you ship to end users.

Operational readiness scalar: **MON** (`minimumOperatingNumber`, `minimumOperatingNumber117`, `minimumOperatingReady`) is an engineering status metric emitted by `verify_post_summary`; it is not a legal representation or warranty.

---

## Open-source dependencies

This monorepo depends on many npm and other packages, each under its own license. To list dependency licenses (for notices or SBOMs), run from the repo root:

```bash
pnpm licenses list
```

You are responsible for **NOTICE** / **attribution** files if you redistribute binaries or source bundles.

---

## User prompts and content

You are responsible for **lawful use** of prompts, files, and media you submit. Do not use the software to **violate** third-party **terms of service**, **copyright**, **trademark**, or **privacy** rights. The maintainers do not monitor end-user inputs.

---

## No warranty; limitation of liability

The Software is provided **“as is”**, without warranties of any kind, whether express or implied, to the fullest extent permitted by law. To the fullest extent permitted by law, the copyright holders and contributors **disclaim liability** for any damages or losses arising from use of or inability to use the Software — including indirect or consequential damages — except where prohibited by law.

**This is not legal advice.** Jurisdictions vary; consult counsel.

---

## Security

See **[`SECURITY.md`](./SECURITY.md)** for how to report **security vulnerabilities** responsibly (do not use public issues for active exploits).

---

## Consumer products

This repository does **not** ship final **cookie policy** or **terms of service** for end users. A **draft** privacy template lives at **[`PRIVACY.md`](./PRIVACY.md)** — replace placeholders and have counsel review before a **public** launch. Wire consent/notice in the product to match **your** data practices and **GDPR / UK GDPR / CCPA** (etc.) as applicable.

---

*Last updated: 2026-03-27 — summarized canonically in `docs/FIRESTARTER.md` §14 and `docs/FIRE.md` §G.*
