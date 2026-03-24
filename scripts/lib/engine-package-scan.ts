/**
 * Filesystem LOC scan for **`packages/shared-engine`** + **`packages/fxp-encoder`**
 * (`.ts`, `.tsx`, `.rs`, `.mjs`) — shared by **`pnpm estimate`** and IOM offline fusion.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { EnginePackageMetrics, PackageLocBreakdown } from "@alchemist/shared-engine";

const EXT = new Set([".ts", ".tsx", ".rs", ".mjs"]);

function lineCount(text: string): number {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

function shouldSkipDir(name: string): boolean {
  return (
    name === "node_modules" ||
    name === "pkg" ||
    name === "target" ||
    name === ".turbo" ||
    name === "dist"
  );
}

function emptyBreakdown(): PackageLocBreakdown {
  return { files: 0, lines: 0, linesTest: 0, linesGen: 0, linesSrc: 0 };
}

function scanPackageRoot(root: string): PackageLocBreakdown {
  const out = emptyBreakdown();
  if (!existsSync(root)) return out;

  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let ents;
    try {
      ents = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of ents) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (shouldSkipDir(ent.name)) continue;
        stack.push(p);
        continue;
      }
      const ext = ent.name.slice(ent.name.lastIndexOf("."));
      if (!EXT.has(ext)) continue;
      let text: string;
      try {
        text = readFileSync(p, "utf8");
      } catch {
        continue;
      }
      const n = lineCount(text);
      out.files += 1;
      out.lines += n;
      const norm = p.replace(/\\/g, "/");
      const isTest = /\/tests\//.test(norm) || /\.test\.ts$/.test(ent.name);
      const isGen = /\.gen\./.test(ent.name);
      if (isTest) out.linesTest += n;
      else if (isGen) out.linesGen += n;
      else out.linesSrc += n;
    }
  }
  return out;
}

function countTestFiles(testsDir: string): number {
  if (!existsSync(testsDir)) return 0;
  let n = 0;
  const stack = [testsDir];
  while (stack.length) {
    const dir = stack.pop()!;
    let ents;
    try {
      ents = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of ents) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(p);
        continue;
      }
      if (ent.name.endsWith(".test.ts")) n += 1;
    }
  }
  return n;
}

/** Walks engine + fxp-encoder packages from monorepo root. */
export function collectEnginePackageMetrics(monorepoRoot: string): EnginePackageMetrics {
  const seRoot = join(monorepoRoot, "packages", "shared-engine");
  const fxRoot = join(monorepoRoot, "packages", "fxp-encoder");
  const sharedEngine = scanPackageRoot(seRoot);
  const fxpEncoder = scanPackageRoot(fxRoot);
  const testFileCount = countTestFiles(join(seRoot, "tests"));

  return {
    totalLines: sharedEngine.lines + fxpEncoder.lines,
    totalFiles: sharedEngine.files + fxpEncoder.files,
    linesTest: sharedEngine.linesTest + fxpEncoder.linesTest,
    linesGen: sharedEngine.linesGen + fxpEncoder.linesGen,
    linesSrc: sharedEngine.linesSrc + fxpEncoder.linesSrc,
    testFileCount,
    byPackage: { sharedEngine, fxpEncoder },
  };
}
