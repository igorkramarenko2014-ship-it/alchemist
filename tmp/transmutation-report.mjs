import { resolveTransmutation } from "../packages/shared-engine/transmutation/transmutation-runner";
import { PolicyFamily } from "../packages/shared-engine/transmutation/transmutation-types";

const cases = [
  "",
  "dark gritty bass",
  "something different and fresh",
  "aggressive techno synthwave",
  "warm soft pad similar vibe",
];

console.log("Transmutation Profile Distribution Report:");
console.log("------------------------------------------");

for (const c of cases) {
  const res = resolveTransmutation(c);
  console.log(`Prompt: "${c}"`);
  console.log(`  Policy: ${res.audit_trace.policy_family}`);
  console.log(`  Confidence: ${res.confidence.toFixed(2)}`);
  console.log(`  Deltas: ${res.audit_trace.deltas_applied.join(", ") || "none"}`);
  console.log(`  Bounds Hit: ${res.audit_trace.bounds_checks.join(", ") || "none"}`);
  console.log("");
}
