#!/usr/bin/env node
/**
 * Quick check: apps/web-app/.env.local has Groq (or LLAMA) key in correct KEY=value form.
 * Run: pnpm env:check   (from repo root)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const envPath = join(root, "apps", "web-app", ".env.local");

console.log("\n=== env check (.env.local) ===\n");

if (!existsSync(envPath)) {
  console.warn("WARN: No .env.local yet — triad API routes return 503 until keys are set.");
  console.warn("  cp apps/web-app/.env.example apps/web-app/.env.local   then edit GROQ_API_KEY=...\n");
  process.exit(0);
}

const raw = readFileSync(envPath, "utf8");
const lines = raw.split(/\r?\n/);

let groq = "";
let llama = "";
let bareGskLine = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i] ?? "";
  const t = line.trim();
  if (t.startsWith("#") || t === "") continue;
  const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) {
    const k = m[1];
    const v = m[2] ?? "";
    if (k === "GROQ_API_KEY") groq = v.trim();
    if (k === "LLAMA_API_KEY") llama = v.trim();
    continue;
  }
  if (/^gsk_[a-zA-Z0-9]+/.test(t)) {
    bareGskLine = i + 1;
  }
}

if (bareGskLine > 0) {
  console.error(`PROBLEM: Line ${bareGskLine} looks like a raw Groq key without GROQ_API_KEY=`);
  console.error("  Fix: put it on one line:  GROQ_API_KEY=paste_here\n");
  process.exit(1);
}

const hasLlama = groq.length > 0 || llama.length > 0;
if (!hasLlama) {
  console.warn("WARN: GROQ_API_KEY and LLAMA_API_KEY are empty — /api/triad/llama returns 503 triad_unconfigured.\n");
  process.exit(0);
}

console.log("OK  Groq/Llama key present (GROQ_API_KEY or LLAMA_API_KEY).");
console.log("OK  File:", envPath);
console.log("    Restart dev after edits:  Ctrl+C  then  pnpm dev\n");
