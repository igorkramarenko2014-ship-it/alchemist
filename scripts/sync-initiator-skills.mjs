#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8"));
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {}
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function skillCountForFact(i) {
  return i < 15 ? 7 : 6;
}

function domainBySkillIndex(idx1) {
  if (idx1 <= 17) return "resilience";
  if (idx1 <= 40) return "performance";
  if (idx1 <= 70) return "creativity";
  if (idx1 <= 100) return "spirit";
  return "apex_execution";
}

function buildSkills(facts) {
  if (!Array.isArray(facts) || facts.length !== 17) {
    throw new Error(`Need exactly 17 facts; got ${Array.isArray(facts) ? facts.length : "invalid"}`);
  }
  const out = [];
  let n = 1;
  for (let i = 0; i < facts.length; i++) {
    for (let k = 0; k < skillCountForFact(i); k++) {
      const domain = domainBySkillIndex(n);
      out.push({
        id: `skill_${String(n).padStart(3, "0")}`,
        parentFactIndex: i + 1,
        parentFact: facts[i],
        domain,
        title: `Skill ${n}: ${domain.replace("_", " ")} / fact ${i + 1}`,
        behaviorRule: `Apply fact "${facts[i]}" in ${domain} decisions without mutating hard gates.`,
        advisoryOnly: true,
      });
      n += 1;
    }
  }
  out[116] = {
    ...out[116],
    title: "Skill 117: The Mother's Smile (advisory, no consensus override)",
    behaviorRule:
      "High-entropy red-zone resonance is advisory only; quality honors mission memory and never overrides HARD GATE, schema law, or deterministic triad governance.",
    advisoryOnly: true,
  };
  return out;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[sync-initiator-skills] monorepo root not found\n");
  process.exit(1);
}

const factsPath = join(root, "packages", "shared-engine", "initiator", "apex-facts.json");
if (!existsSync(factsPath)) {
  process.stderr.write(`[sync-initiator-skills] missing ${factsPath}\n`);
  process.exit(1);
}
const raw = readFileSync(factsPath, "utf8");
const factsDoc = JSON.parse(raw);
const facts = factsDoc?.facts;
const skills = buildSkills(facts);
const manifest = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  factCount: facts.length,
  skillCount: skills.length,
  initiationStatus: `${skills.length}/117_READY`,
  advisoryOnly: true,
  facts,
  skills,
};

const outDir = join(root, "artifacts", "initiator");
mkdirSync(outDir, { recursive: true });
const body = `${JSON.stringify(manifest, null, 2)}\n`;
const hash = createHash("sha256").update(body).digest("hex");
writeFileSync(join(outDir, "skills-117-manifest.json"), body, "utf8");
writeFileSync(join(outDir, "skills-117-manifest.sha256"), `${hash}  artifacts/initiator/skills-117-manifest.json\n`, "utf8");
process.stdout.write(`[sync-initiator-skills] wrote artifacts/initiator/skills-117-manifest.json (${manifest.initiationStatus})\n`);
