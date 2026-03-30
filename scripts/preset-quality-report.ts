#!/usr/bin/env npx tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPresetQualityReport,
  PRESET_QUALITY_EVAL_CASES,
} from "../packages/shared-engine/learning/preset-quality.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const outDir = join(root, "artifacts");
const outPath = join(outDir, "preset-quality-report.json");

mkdirSync(outDir, { recursive: true });

const report = buildPresetQualityReport(PRESET_QUALITY_EVAL_CASES);
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

process.stdout.write(
  `${JSON.stringify({
    status: "ok",
    outputPath: "artifacts/preset-quality-report.json",
    promptCount: report.promptCount,
    meanDeltaScore: report.summary.meanDeltaScore,
    nonRegressionRate: report.summary.nonRegressionRate,
    improvedRate: report.summary.improvedRate,
  })}\n`,
);
