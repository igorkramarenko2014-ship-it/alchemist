/**
 * CLI: same numbers as IOM **`iomEngineHeuristic`** fusion — `pnpm estimate`
 */
import { computeEngineValuationHeuristic } from "@alchemist/shared-engine";
import { collectEnginePackageMetrics } from "./lib/engine-package-scan";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, "..");
  const metrics = collectEnginePackageMetrics(root);
  const h = computeEngineValuationHeuristic(metrics);
  const se = metrics.byPackage.sharedEngine;
  const fx = metrics.byPackage.fxpEncoder;

  process.stdout.write(`Alchemist engine-estimate (heuristic — not professional valuation)
Root: ${root}

${h.philosophyNote}

LOC scope: packages/shared-engine + packages/fxp-encoder (.ts, .tsx, .rs, .mjs)
  shared-engine: ${se.files} files, ${se.lines} lines (tests ${se.linesTest}, gen ${se.linesGen}, other ${se.linesSrc})
  fxp-encoder:   ${fx.files} files, ${fx.lines} lines (tests ${fx.linesTest}, gen ${fx.linesGen}, other ${fx.linesSrc})
  total:         ${metrics.totalFiles} files, ${metrics.totalLines} lines

Tests: ${metrics.testFileCount} *.test.ts files under shared-engine/tests (run pnpm test:engine for live counts)

Replacement time (assumes 40–120 effective LOC/day incl. design/review/tests):
  ~${h.personDaysBand[0].toFixed(0)}–${h.personDaysBand[1].toFixed(0)} person-days (~${h.engMonthsBand[0].toFixed(1)}–${h.engMonthsBand[1].toFixed(1)} eng-months @ 21d/mo; mid ${h.engMonthsMid.toFixed(1)} mo @ 80 LOC/d)

Replacement cost (fully loaded $18,000–$35,000/eng-mo):
  ~$${h.replacementCostUsdBand[0].toLocaleString()} – $${h.replacementCostUsdBand[1].toLocaleString()} (mid $${h.replacementCostUsdMid.toLocaleString()})

Typical negotiation anchors (illustrative):
  Non-exclusive license year 1 (~15%–40% of mid replacement): ~$${h.nonExclusiveLicenseYear1UsdBand[0].toLocaleString()} – $${h.nonExclusiveLicenseYear1UsdBand[1].toLocaleString()} (mid ~$${h.nonExclusiveLicenseYear1UsdMid.toLocaleString()})
  Exclusive asset sale (often ~1×–3× mid replacement if buyer is motivated + clean IP): ~$${h.exclusiveAssetUsdBand[0].toLocaleString()} – $${h.exclusiveAssetUsdBand[1].toLocaleString()}+

IOM: ${h.operatorLine}

`);
}

main();
