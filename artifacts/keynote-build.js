ObjC.import('stdlib');
const keynote = Application('Keynote');
keynote.activate();
const doc = keynote.Document().make();
const slides = [{"title":"AIOM — Governed Inference Infrastructure","body":"Most AI systems are black boxes. AIOM turns generation into bounded, auditable infrastructure."},{"title":"AI Healthy Environment","body":"Deterministic TypeScript gatekeeping\\nNo shadow governance\\nExplicit degraded-mode telemetry"},{"title":"AIOM Control Plane","body":"Triad orchestration + consensus\\nSlavic/Undercover validation\\nHuman-in-the-loop policy evolution"},{"title":"Proof Layer","body":"Tests: 292 / 55 files\\nAIOM integrity: 0.92\\nReceipt: available"},{"title":"Resilience & Immunity","body":"PNH scenarios: 25\\nBreaches: 2\\nVerdict: degraded"}];
for (let i = 0; i < slides.length; i++) {
  const data = slides[i];
  const s = i === 0 ? doc.slides[0] : keynote.Slide({}).make({ at: doc.slides.end });
  if (i > 0) {
    doc.slides.push(s);
  }
  try { s.defaultTitleItem().objectText().set(data.title); } catch (e) {}
  try { s.defaultBodyItem().objectText().set(data.body.replace(/\\n/g, '\\r')); } catch (e) {}
}