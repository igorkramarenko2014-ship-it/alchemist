import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..", "..");
const validatorPath = join(root, "packages", "shared-engine", "personas", "scripts", "validate-personas.mjs");

describe("Persona Module Validation", () => {
  let testId = 0;
  let currentTmpRoot = "";

  function getFreshTmpRoot() {
    testId++;
    const rootPath = join(root, "tmp", `persona-test-${testId}-${Date.now()}`);
    mkdirSync(join(rootPath, "packages", "shared-engine", "personas", "schema"), { recursive: true });
    mkdirSync(join(rootPath, "packages", "shared-engine", "personas", "corpus"), { recursive: true });
    
    const realSchema = join(root, "packages", "shared-engine", "personas", "schema", "persona.schema.json");
    const schemaContent = require("node:fs").readFileSync(realSchema, "utf8");
    writeFileSync(join(rootPath, "packages", "shared-engine", "personas", "schema", "persona.schema.json"), schemaContent);
    writeFileSync(join(rootPath, "package.json"), JSON.stringify({ name: "alchemist", workspaces: [] }));
    
    return rootPath;
  }

  function runValidator(tmpRoot: string) {
    return spawnSync(process.execPath, [validatorPath], {
      cwd: tmpRoot,
      encoding: "utf8",
      env: { ...process.env, ALCHEMIST_PERSONAS_ROOT_OVERRIDE: tmpRoot, ALCHEMIST_DEBUG_PERSONAS: "1" }
    });
  }

  function createPersona(tmpRoot: string, id: string, overrides: any = {}) {
    const corpusPath = join(tmpRoot, "packages", "shared-engine", "personas", "corpus");
    const logics = Array.from({ length: 17 }, (_, i) => ({
      id: `L${String(i + 1).padStart(2, "0")}`,
      label: `Logic ${i + 1}`,
      description: `Description for logic ${i + 1} that is at least twenty chars long.`
    }));
    const commands = Array.from({ length: 117 }, (_, i) => ({
      id: `C${String(i + 1).padStart(3, "0")}`,
      logic: "L01",
      command: "Command",
      intent: "Intent for this command"
    }));
    
    const persona = {
      id,
      schemaVersion: "1.0",
      name: "Test Persona",
      role: "System Role for Testing",
      sourceType: "chat_export",
      anonymous: false,
      character: "A character description that is at least thirty characters long for verification.",
      coreValues: ["Value 1", "Value 2"],
      logics,
      commands,
      aiomFunction: "AIOM Functionality description",
      contrastWith: [],
      ...overrides
    };
    writeFileSync(join(corpusPath, `${id}.json`), JSON.stringify(persona));
  }

  it("empty corpus → validator exits 0", () => {
    const tmp = getFreshTmpRoot();
    const result = runValidator(tmp);
    try {
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.status).toBe("ok");
      expect(parsed.validatedFiles).toBe(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("valid persona JSON → passes schema", () => {
    const tmp = getFreshTmpRoot();
    createPersona(tmp, "valid_persona");
    const result = runValidator(tmp);
    try {
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).status).toBe("ok");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("logics count ≠ 17 → validator fails", () => {
    const tmp = getFreshTmpRoot();
    createPersona(tmp, "invalid_logics", { logics: [] });
    const result = runValidator(tmp);
    try {
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toContain("17 items");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("commands count ≠ 117 → validator fails", () => {
    const tmp = getFreshTmpRoot();
    createPersona(tmp, "invalid_commands", { commands: [] });
    const result = runValidator(tmp);
    try {
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toContain("117 items");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("command references invalid logic id → fails", () => {
    const tmp = getFreshTmpRoot();
    const commands = Array.from({ length: 117 }, () => ({
      id: "C001",
      logic: "L99", 
      command: "Command",
      intent: "Intent for this command"
    }));
    createPersona(tmp, "invalid_ref", { commands });
    const result = runValidator(tmp);
    try {
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toContain("references invalid logic id: L99");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("duplicate persona id → fails", () => {
    const tmp = getFreshTmpRoot();
    createPersona(tmp, "p1");
    // manually write another file with same id
    const corpusPath = join(tmp, "packages", "shared-engine", "personas", "corpus");
    const persona = JSON.parse(require("node:fs").readFileSync(join(corpusPath, "p1.json"), "utf8"));
    writeFileSync(join(corpusPath, "p2.json"), JSON.stringify(persona));
    
    const result = runValidator(tmp);
    try {
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toContain("duplicate persona id: p1");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("anonymous persona → name is alias, passes", () => {
    const tmp = getFreshTmpRoot();
    createPersona(tmp, "anon", { anonymous: true, name: "Alias" });
    const result = runValidator(tmp);
    try {
      expect(result.status).toBe(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("contrastWith self-reference → fails", () => {
    const tmp = getFreshTmpRoot();
    createPersona(tmp, "self_contrast", { contrastWith: ["self_contrast"] });
    const result = runValidator(tmp);
    try {
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toContain("cannot contrast with self: self_contrast");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
