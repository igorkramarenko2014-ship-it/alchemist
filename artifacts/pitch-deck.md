# AIOM — Governed Inference Infrastructure

Most AI systems are black boxes. AIOM turns generation into bounded, auditable infrastructure.

---
# AI Healthy Environment

- Deterministic TypeScript gatekeeping
- No shadow governance
- Explicit degraded-mode telemetry

---
# AIOM Control Plane

- Triad orchestration + consensus behavior
- Slavic/Undercover validation pipeline
- Human-in-the-loop policy evolution

---
# Proof Layer

- Tests: 292 across 55 files
- AIOM integrity score: 0.92
- Release receipt: available

---
# Resilience & Immunity

- PNH total scenarios: 25
- Breaches: 2
- Security verdict: degraded

---
# Integration

```ts
const triad = await fetch("http://127.0.0.1:3000/api/triad/deepseek", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
const triadJson = await triad.json();
const truth = await fetch("http://127.0.0.1:3000/api/health/truth", { headers: { "X-Ops-Token": process.env.ALCHEMIST_OPS_TOKEN ?? "" } });
const truthJson = await truth.json();
const receipt = JSON.parse(await fs.promises.readFile("artifacts/release-audit-receipt-latest.json", "utf8"));
```

---
# Close

AIOM is infrastructure for controlled AI: orchestrated, validated, and machine-verifiable.

