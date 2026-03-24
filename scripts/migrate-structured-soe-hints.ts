/**
 * Offline migration: lines of JSON or raw text → structured SOE hints (JSONL).
 * Does **not** change **`verify_post_summary`** — use for log archives / SIEM prep only.
 *
 * Usage (repo root):
 *   pnpm soe:migrate -- path/to/input.jsonl path/to/output.jsonl
 *   pnpm soe:migrate   # defaults: tools/soe-hints-legacy.jsonl → tools/structured-soe-hints.jsonl
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseLegacySoeHintMessage,
  type StructuredSoeHint,
} from "@alchemist/shared-engine";

function parseLine(line: string): StructuredSoeHint | null {
  const t = line.trim();
  if (!t) return null;
  try {
    const o = JSON.parse(t) as { message?: string; recommendationId?: string; severity?: string };
    if (o && typeof o.recommendationId === "string" && typeof o.severity === "string") {
      return o as StructuredSoeHint;
    }
    const msg = typeof o?.message === "string" ? o.message : t;
    return { ...parseLegacySoeHintMessage(msg), message: msg };
  } catch {
    return parseLegacySoeHintMessage(t);
  }
}

function migrateFile(inputPath: string, outputPath: string): void {
  if (!existsSync(inputPath)) {
    process.stderr.write(
      `soe:migrate: input not found: ${inputPath}\n` +
        `  Create it (JSONL: one hint per line) or pass paths:\n` +
        `  pnpm soe:migrate -- path/to/in.jsonl path/to/out.jsonl\n`,
    );
    process.exit(1);
  }
  const lines = readFileSync(inputPath, "utf8").split(/\r?\n/);
  const out: StructuredSoeHint[] = [];
  for (const line of lines) {
    const h = parseLine(line);
    if (h) out.push({ ...h, message: h.message });
  }
  writeFileSync(outputPath, `${out.map((x) => JSON.stringify(x)).join("\n")}\n`, "utf8");
  process.stdout.write(`soe:migrate: ${out.length} lines → ${outputPath}\n`);
}

function main(): void {
  const argv = process.argv.slice(2);
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, "..");
  const defIn = join(root, "tools", "soe-hints-legacy.jsonl");
  const defOut = join(root, "tools", "structured-soe-hints.jsonl");
  const input = argv[0] ?? defIn;
  const output = argv[1] ?? defOut;
  migrateFile(input, output);
}

main();
