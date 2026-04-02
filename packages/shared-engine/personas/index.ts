export interface PersonaLogic {
  id: string; // L01..L17
  label: string;
  description: string;
}

export interface PersonaCommand {
  id: string; // C001..C117
  logic: string; // references logic.id
  command: string;
  intent: string;
}

export interface Persona {
  id: string;
  schemaVersion: "1.0";
  name: string;
  role: string;
  sourceType: "chat_export" | "operator_notes" | "interview";
  anonymous: boolean;
  character: string;
  coreValues: string[];
  logics: PersonaLogic[]; // Exactly 17
  commands: PersonaCommand[]; // Exactly 117
  aiomFunction: string;
  contrastWith: string[];
}
