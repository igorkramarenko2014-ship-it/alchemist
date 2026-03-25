# Privacy information — template (Project Alchemist)

**This is not legal advice.** Replace bracketed placeholders, have counsel review before any **public** launch or processing of **EU/UK/CA** residents’ data.

**Status:** Draft template. The web app may send **prompts** and **telemetry** to **your** configured services. You must publish a final policy at your **product URL** when you ship to end users.

---

## 1. Who is responsible?

**Data controller:** [Your legal name / entity], [contact email].

**Processor / sub-processors (if applicable):** [e.g. hosting (Vercel), LLM APIs (DeepSeek, OpenAI-compatible routes, Qwen, etc.) — list only what you actually use.]

---

## 2. What we process

| Category | Examples | Purpose |
|----------|----------|---------|
| **Prompts & usage** | Text you type or speak for preset generation | Run the triad / ranking features |
| **Technical data** | IP, user agent, timestamps (if your server logs them) | Security, abuse prevention, debugging |
| **Telemetry (optional)** | Structured events (e.g. triad timing) as implemented in `shared-engine` | Operations, product improvement |
| **Shared preset links (if enabled)** | Prompt text, reasoning, param snapshot, score — whatever your **`SharedPreset`** / share UI sends to **`POST /api/presets/share`** | User-chosen link to **`/presets/[slug]`**; treat server memory / logs like other app data (today: in-process store unless you add a DB) |

---

## 3. AI / LLM providers

If you enable routes that call **external LLM APIs**:

- **What is sent:** Typically **prompt text** (and possibly metadata your code attaches).  
- **Retention:** Governed by **each provider’s** policy — link them here.  
- **Location:** Note if data may be processed **outside** your country.

**Your obligation:** Obtain lawful bases (e.g. consent, contract) and provide **clear notice** before first collection where required.

---

## 4. Legal bases (GDPR-style, if applicable)

- [ ] **Contract** — necessary to provide the service the user requested.  
- [ ] **Consent** — for optional analytics or marketing.  
- [ ] **Legitimate interests** — security and fraud prevention (document balancing test).

---

## 5. Retention

- **Server logs:** [e.g. 30 / 90 days] — adjust to practice.  
- **Provider-side copies:** Per provider dashboards / terms.  
- **No “shadow” retention:** Product code should not hide data flows — see **FIRE** / **LEGAL.md**.

---

## 6. Your rights (EEA/UK/CA and similar)

Users may have rights to **access**, **rectify**, **delete**, **export**, or **object** to certain processing. Describe **how to contact** you and **response time**.

---

## 7. Children

The service is **not** directed at children under [13 / 16 — pick per jurisdiction]. Do not collect children’s data knowingly.

---

## 8. Changes

We will post updates here / at [URL] and revise the “Last updated” date.

**Last updated:** 2026-03-25 (template — shared preset row added)

---

## 9. Related repo documents

- **`LEGAL.md`** — trademarks, disclaimers, liability.  
- **`SECURITY.md`** — vulnerability reporting.  
- **`docs/FIRE.md` §G**, **`docs/FIRESTARTER.md` §14** — assessment hooks (not a substitute for this file).
