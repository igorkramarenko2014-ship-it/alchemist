import type { AICandidate } from "@alchemist/shared-types";

export type InitiatorDomain =
  | "resilience"
  | "performance"
  | "creativity"
  | "spirit"
  | "apex_execution";

export interface InitiatorSkill {
  id: string;
  parentFactIndex: number;
  parentFact: string;
  domain: InitiatorDomain;
  title: string;
  behaviorRule: string;
  advisoryOnly: boolean;
}

const TOTAL_SKILLS = 117;

const DOMAIN_BY_INDEX: InitiatorDomain[] = [
  ...Array.from({ length: 17 }, () => "resilience" as const),
  ...Array.from({ length: 23 }, () => "performance" as const),
  ...Array.from({ length: 30 }, () => "creativity" as const),
  ...Array.from({ length: 30 }, () => "spirit" as const),
  ...Array.from({ length: 17 }, () => "apex_execution" as const),
];

function skillCountForFact(factIndexZeroBased: number): number {
  // 117 / 17 => 6 with remainder 15.
  return factIndexZeroBased < 15 ? 7 : 6;
}

function behaviorTemplate(domain: InitiatorDomain, fact: string): string {
  switch (domain) {
    case "resilience":
      return `Sadhu-17 resilience: preserve structural integrity under pressure using fact: "${fact}"`;
    case "performance":
      return `IT-runner performance: optimize speed and precision (race-to-two aware) with fact: "${fact}"`;
    case "creativity":
      return `Portrait-artist creativity: maximize high-fidelity detail without gate mutation using fact: "${fact}"`;
    case "spirit":
      return `Alpaka/Lion spirit: calm governance with warrior enforcement using fact: "${fact}"`;
    case "apex_execution":
      return `Apex execution: honor mission quality with auditable high-entropy moves under fact: "${fact}"`;
  }
}

export function generate117Skills(facts: string[]): InitiatorSkill[] {
  const cleanFacts = facts.map((f) => f.trim()).filter((f) => f.length > 0);
  if (cleanFacts.length !== 17) {
    throw new Error(`Initiator requires exactly 17 facts, received ${cleanFacts.length}`);
  }
  const out: InitiatorSkill[] = [];
  let skillNo = 1;
  for (let i = 0; i < cleanFacts.length; i++) {
    const n = skillCountForFact(i);
    for (let k = 0; k < n; k++) {
      const domain = DOMAIN_BY_INDEX[skillNo - 1] ?? "apex_execution";
      const title = `Skill ${skillNo}: ${domain.replace("_", " ")} / fact ${i + 1}`;
      out.push({
        id: `skill_${String(skillNo).padStart(3, "0")}`,
        parentFactIndex: i + 1,
        parentFact: cleanFacts[i],
        domain,
        title,
        behaviorRule: behaviorTemplate(domain, cleanFacts[i]),
        advisoryOnly: true,
      });
      skillNo += 1;
    }
  }
  if (out.length !== TOTAL_SKILLS) {
    throw new Error(`Internal invariant failed: expected ${TOTAL_SKILLS}, got ${out.length}`);
  }
  // Canon-safe apex skill: advisory only, no gate/triad override.
  out[TOTAL_SKILLS - 1] = {
    ...out[TOTAL_SKILLS - 1],
    title: "Skill 117: The Mother's Smile (advisory, no consensus override)",
    behaviorRule:
      "Prioritize high-entropy red-zone resonance as an advisory ranking signal only; quality must honor mission memory, and never override HARD GATE, schema law, or deterministic triad governance.",
    advisoryOnly: true,
  };
  return out;
}

export function computeVibeMismatchPenalty(candidate: AICandidate, expectedDomain: InitiatorDomain): number {
  const red = candidate.redZoneResonanceScore ?? 0.5;
  const spa = candidate.socialResonanceScore ?? 0.5;
  const intent = candidate.intentAlignmentScore ?? 0.5;
  if (expectedDomain === "creativity") return Math.max(0, 0.6 - (0.6 * red + 0.4 * spa));
  if (expectedDomain === "resilience") return Math.max(0, 0.55 - (0.5 * intent + 0.5 * spa));
  if (expectedDomain === "performance") return Math.max(0, 0.62 - (0.55 * intent + 0.45 * red));
  if (expectedDomain === "spirit") return Math.max(0, 0.58 - (0.4 * intent + 0.6 * spa));
  return Math.max(0, 0.7 - (0.5 * red + 0.5 * intent));
}
