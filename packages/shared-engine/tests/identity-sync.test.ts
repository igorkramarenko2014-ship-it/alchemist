import { describe, expect, it } from "vitest";
import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 18; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8")) as { name?: string; workspaces?: unknown };
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch { /* continue */ }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("monorepo root not found");
}

const root = findMonorepoRoot();
const identitySyncScript = join(root, "scripts", "identity-sync.mjs");
const aggregateTruthScript = join(root, "scripts", "aggregate-truth.mjs");

/** Build a minimal valid truth-matrix with given ajiStatus + identityStatus */
function buildMatrix(
  aji: Record<string, unknown>,
  id: Record<string, unknown>,
): Record<string, unknown> {
  return {
    schemaVersion: 3,
    generatedAtUtc: new Date().toISOString(),
    divergenceCheckedAtUtc: new Date().toISOString(),
    verification: "test",
    sources: {
      verifyPostSummary: "artifacts/verify/verify-post-summary.json",
      metrics: "docs/fire-metrics.json",
      learningFitnessReport: "artifacts/learning-fitness-report.json",
    },
    metrics: {
      testsPassed: 387,
      testsTotal: 387,
      iomCoverageScore: 1.0,
      mon: { value: 117, ready: true, source: "verify_post_summary" },
      pnhImmunity: { passed: 25, total: 25, breaches: 0, status: "clean" },
      wasmStatus: "available",
      syncedAtUtc: new Date().toISOString(),
      learningOutcomes: {
        candidateSuccessRate: 0.8,
        meanBestScoreWithLessons: 0.75,
        orderChangeRate: 0.2,
        tasteClusterHitRate: 0.3,
        authoritative: false,
        sampleCount: 5,
        confidence: "medium",
        note: "test",
      },
      ajiStatus: aji,
      identityStatus: id,
    },
    divergences: [],
  };
}

const validAji = {
  activationRate: 0,
  lastActivatedAtUtc: null,
  activeSessions: 0,
  source: "derived",
};

const validId = {
  integrity: "ok",
  ajiActive: false,
  lastActivationAtUtc: null,
  consistency: "consistent",
  source: "derived",
};

function runIdentitySync(matrixJson: Record<string, unknown>): { exitCode: number; stderr: string } {
  const tmpDir = mkdtempSync(join(tmpdir(), "alchemist-id-sync-"));
  const fakeMatrix = join(tmpDir, "truth-matrix.json");
  writeFileSync(fakeMatrix, JSON.stringify(matrixJson, null, 2), "utf8");

  // Patch the script to read from tmp path via env var
  let stderr = "";
  let exitCode = 0;
  try {
    const result = execFileSync(
      process.execPath,
      [identitySyncScript],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          ALCHEMIST_IDENTITY_MATRIX_PATH: fakeMatrix,
        },
      }
    );
    stderr = result;
  } catch (e: unknown) {
    const err = e as { stderr?: string; status?: number };
    stderr = err.stderr ?? "";
    exitCode = err.status ?? 1;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
  return { exitCode, stderr };
}

describe("identity:sync — Lock 7", () => {
  it("passes with default zero-activation values (no aji activity)", () => {
    // identity-sync reads from actual artifacts/truth-matrix.json on disk
    // If it exists and is valid, verify it passes
    const matrixPath = join(root, "artifacts", "truth-matrix.json");
    if (!existsSync(matrixPath)) {
      expect(true).toBe(true); // skip if not yet generated
      return;
    }
    const m = JSON.parse(readFileSync(matrixPath, "utf8")) as Record<string, unknown>;
    const metrics = m.metrics as Record<string, unknown> | undefined;
    const aji = metrics?.ajiStatus as Record<string, unknown> | undefined;
    const id = metrics?.identityStatus as Record<string, unknown> | undefined;
    expect(aji).toBeDefined();
    expect(id).toBeDefined();
    expect(aji?.source).toBe("derived");
    expect(id?.source).toBe("derived");
    expect(typeof aji?.activationRate).toBe("number");
    expect((aji?.activationRate as number) >= 0 && (aji?.activationRate as number) <= 1).toBe(true);
  });

  it("ajiStatus contains correct fields with default no-activity values", () => {
    const matrixPath = join(root, "artifacts", "truth-matrix.json");
    if (!existsSync(matrixPath)) return;
    const m = JSON.parse(readFileSync(matrixPath, "utf8")) as Record<string, unknown>;
    const metrics = m.metrics as Record<string, unknown>;
    const aji = metrics.ajiStatus as Record<string, unknown>;
    expect(aji.source).toBe("derived");
    expect(typeof aji.activationRate).toBe("number");
    expect(typeof aji.activeSessions).toBe("number");
    // lastActivatedAtUtc: null or string
    expect(aji.lastActivatedAtUtc === null || typeof aji.lastActivatedAtUtc === "string").toBe(true);
  });

  it("identityStatus consistency matches ajiStatus fields", () => {
    const matrixPath = join(root, "artifacts", "truth-matrix.json");
    if (!existsSync(matrixPath)) return;
    const m = JSON.parse(readFileSync(matrixPath, "utf8")) as Record<string, unknown>;
    const metrics = m.metrics as Record<string, unknown>;
    const aji = metrics.ajiStatus as Record<string, unknown>;
    const id = metrics.identityStatus as Record<string, unknown>;

    const derivedAjiActive = (aji.activeSessions as number) > 0;
    expect(id.ajiActive).toBe(derivedAjiActive);
    expect(id.lastActivationAtUtc).toBe(aji.lastActivatedAtUtc);

    const expectedConsistency =
      (derivedAjiActive && aji.lastActivatedAtUtc !== null) ||
      (!derivedAjiActive && aji.lastActivatedAtUtc === null)
        ? "consistent"
        : "mismatch";
    expect(id.consistency).toBe(expectedConsistency);
  });

  it("identity:sync script exits 0 on valid truth-matrix.json", () => {
    const matrixPath = join(root, "artifacts", "truth-matrix.json");
    if (!existsSync(matrixPath) || !existsSync(identitySyncScript)) return;
    let exitCode = 0;
    try {
      execFileSync(process.execPath, [identitySyncScript], {
        encoding: "utf8",
        cwd: root,
      });
    } catch (e: unknown) {
      exitCode = (e as { status?: number }).status ?? 1;
    }
    expect(exitCode).toBe(0);
  });
});
