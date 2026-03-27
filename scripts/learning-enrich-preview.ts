/**
 * Preview Engine School context for a user prompt (no env gate — for operators).
 * Run from monorepo root after `pnpm learning:build-index`.
 */
import {
  buildLearningContext,
  loadLearningIndex,
  selectLessonsForPrompt,
} from "@alchemist/shared-engine";

const argv = process.argv.slice(2);
const prompt = (argv[0] === "--" ? argv.slice(1) : argv).join(" ").trim();
if (!prompt) {
  process.stderr.write('usage: pnpm learning:enrich-preview -- "<user prompt>"\n');
  process.exit(1);
}

const index = loadLearningIndex();
if (!index) {
  process.stderr.write(
    "No valid learning-index.json — run pnpm learning:build-index from repo root (or set ALCHEMIST_LEARNING_INDEX_PATH).\n",
  );
  process.exit(1);
}

const selected = selectLessonsForPrompt(index, prompt);
const ctx = buildLearningContext(selected);
process.stdout.write(
  `${ctx.length > 0 ? ctx : "(empty — no scored lesson overlap for this prompt)"}\n`,
);
