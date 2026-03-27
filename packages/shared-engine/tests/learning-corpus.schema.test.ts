import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

/** `tests/` → `shared-engine` → `packages` → monorepo root */
const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

describe("Engine School corpus", () => {
  it("validates every committed lesson JSON against lesson.schema.json", () => {
    execFileSync(process.execPath, [join(monorepoRoot, "scripts", "validate-learning-corpus.mjs")], {
      cwd: monorepoRoot,
      stdio: "inherit",
    });
  });
});
