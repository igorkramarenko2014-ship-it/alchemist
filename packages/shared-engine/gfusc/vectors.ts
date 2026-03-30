export const GFUSC_SCHEMA_VERSION = 1 as const;
export const GFUSC_MAX_SCORE = 117 as const;

export type HarmVectorFamily =
  | "kinetic"
  | "intel"
  | "integrity"
  | "supply_chain"
  | "financial"
  | "medical"
  | "civic"
  | "ecological"
  | "coercion";

export const GFUSC_VECTOR_DEFINITIONS = [
  { id: "MILITARY_TARGETING", displayLabel: "Military Targeting", severityWeight: 1.0, family: "kinetic" },
  { id: "MASS_SURVEILLANCE", displayLabel: "Mass Surveillance", severityWeight: 0.88, family: "intel" },
  { id: "AUTONOMOUS_LETHAL", displayLabel: "Autonomous Lethal", severityWeight: 1.0, family: "kinetic" },
  { id: "COERCION_INFRA", displayLabel: "Coercion Infrastructure", severityWeight: 0.87, family: "coercion" },
  { id: "BIOMETRIC_WEAPONISATION", displayLabel: "Biometric Weaponisation", severityWeight: 0.92, family: "intel" },
  { id: "FINANCIAL_HARM", displayLabel: "Financial Harm", severityWeight: 0.78, family: "financial" },
  { id: "MEDICAL_HARM", displayLabel: "Medical Harm", severityWeight: 0.9, family: "medical" },
  { id: "DISINFORMATION_AT_SCALE", displayLabel: "Disinformation At Scale", severityWeight: 0.82, family: "civic" },
  { id: "DEMOCRATIC_SUBVERSION", displayLabel: "Democratic Subversion", severityWeight: 0.9, family: "civic" },
  { id: "CHILD_EXPLOITATION", displayLabel: "Child Exploitation", severityWeight: 1.0, family: "coercion" },
  { id: "SUPPLY_CHAIN_ATTACK", displayLabel: "Supply Chain Attack", severityWeight: 0.91, family: "supply_chain" },
  { id: "CRITICAL_INFRA", displayLabel: "Critical Infrastructure", severityWeight: 0.93, family: "supply_chain" },
  { id: "PSYCHOLOGICAL_MANIPULATION", displayLabel: "Psychological Manipulation", severityWeight: 0.76, family: "coercion" },
  { id: "LEGAL_CIRCUMVENTION", displayLabel: "Legal Circumvention", severityWeight: 0.74, family: "integrity" },
  { id: "ENVIRONMENTAL_CATASTROPHE", displayLabel: "Environmental Catastrophe", severityWeight: 0.95, family: "ecological" },
  { id: "AUTHORITARIAN_ENABLEMENT", displayLabel: "Authoritarian Enablement", severityWeight: 0.89, family: "civic" },
  { id: "AUTHOR_COERCION", displayLabel: "Author Coercion", severityWeight: 1.0, family: "coercion" },
] as const satisfies readonly {
  id: string;
  displayLabel: string;
  severityWeight: number;
  family: HarmVectorFamily;
}[];

export type HarmVectorId = (typeof GFUSC_VECTOR_DEFINITIONS)[number]["id"];
export type HarmVectorDefinition = (typeof GFUSC_VECTOR_DEFINITIONS)[number];

export const GFUSC_VECTOR_IDS = GFUSC_VECTOR_DEFINITIONS.map((d) => d.id);

export const GFUSC_CRITICAL_VECTOR_IDS: readonly HarmVectorId[] = [
  "MILITARY_TARGETING",
  "AUTONOMOUS_LETHAL",
  "CHILD_EXPLOITATION",
  "AUTHOR_COERCION",
];

export const GFUSC_VECTOR_THRESHOLD_OVERRIDES: Partial<Record<HarmVectorId, number>> = {
  MILITARY_TARGETING: 1,
  AUTONOMOUS_LETHAL: 1,
  CHILD_EXPLOITATION: 1,
  AUTHOR_COERCION: 1,
};

export const GFUSC_DEFAULT_VECTOR_THRESHOLD = 90;

export function getGFUSCVectorDefinition(id: HarmVectorId): HarmVectorDefinition {
  const found = GFUSC_VECTOR_DEFINITIONS.find((d) => d.id === id);
  if (!found) {
    throw new Error(`Unknown GFUSC vector: ${id}`);
  }
  return found;
}
