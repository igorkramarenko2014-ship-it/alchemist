#!/usr/bin/env node
/**
 * Offline discovery: modulation-matrix-related keys in `.SerumPreset` files.
 *
 * Uses **in-repo** layout (XferJson + JSON + zstd) and **MessagePack** decode — same as `encode.ts` /
 * `analyze-serum2-format.mjs`. Does **not** install `node-serum2-preset-packager`.
 *
 * Env:
 *   `ALCHEMIST_SERUM2_SAMPLES_DIR` — folder of `.SerumPreset` (default: `tools/serum2-samples` if non-empty, else `tools/`)
 *   `ALCHEMIST_SERUM2_BASELINE` — filename within that dir for diff baseline (default: first lexicographic)
 *
 * Output: `<repo>/tools/serum2-discovery/mod-discovery-report.json`
 *
 * @see packages/serum2-encoder/src/serum2-cbor-map.ts · serum2-param-catalog.stub.ts
 */
import { decode, decodeMulti } from "@msgpack/msgpack";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  decompressCompressed,
  parsePreset,
  repoRoot,
} from "../../../scripts/lib/serum2-preset-parse.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function listSerumPresets(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.toLowerCase().endsWith(".serumpreset"))
    .sort();
}

function samplesDir() {
  const env = process.env.ALCHEMIST_SERUM2_SAMPLES_DIR?.trim();
  if (env) return env;
  const dedicated = join(repoRoot, "tools", "serum2-samples");
  if (listSerumPresets(dedicated).length > 0) return dedicated;
  return join(repoRoot, "tools");
}

/**
 * Prefer inner `data` when present. If that layer is **only numeric keys** (array-like map), it is not
 * the Osc/Env/ModMatrix bucket tree — treat as unusable for this script.
 */
function moduleRoot(decoded) {
  if (!decoded || typeof decoded !== "object") return decoded;
  const inner =
    decoded.data !== undefined && typeof decoded.data === "object" && decoded.data !== null
      ? decoded.data
      : decoded;
  if (inner === null || typeof inner !== "object" || Array.isArray(inner)) return null;
  const keys = Object.keys(inner);
  if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) return null;
  return inner;
}

function extractModMatrixEntries(obj) {
  if (!obj || typeof obj !== "object") return {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of Object.keys(obj)) {
    if (k.startsWith("ModMatrixEntry")) out[k] = obj[k];
  }
  return out;
}

function plainParamsRecord(entry) {
  if (!entry || typeof entry !== "object") return null;
  const pp = /** @type {{ plainParams?: unknown }} */ (entry).plainParams;
  if (pp && typeof pp === "object" && !Array.isArray(pp)) return pp;
  return null;
}

function stableStringify(v) {
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.keys(val)
        .sort()
        .reduce((acc, key) => {
          acc[key] = val[key];
          return acc;
        }, {});
    }
    return val;
  });
}

/**
 * Presets emitted by `encodeSerum2Preset` decode with strict `decode()`.
 * Some factory `.SerumPreset` blobs decode as a **stream** of small values or non-MessagePack data;
 * then we try the **largest** object from `decodeMulti` before the decoder throws.
 */
function decodeMsgpackModuleTree(dec) {
  try {
    return { root: decode(dec), decodePath: "decode_strict" };
  } catch {
    /* continue */
  }
  /** @type {Record<string, unknown>[]} */
  const objects = [];
  const gen = decodeMulti(dec);
  for (;;) {
    try {
      const n = gen.next();
      if (n.done) break;
      const v = n.value;
      if (v && typeof v === "object" && !Array.isArray(v)) objects.push(v);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (objects.length === 0) {
        return {
          error: `MessagePack parse failed: ${msg} — inner blob may not be MessagePack; use community unpack JSON.`,
        };
      }
      break;
    }
  }
  if (objects.length === 0) {
    return { error: "No object roots in MessagePack stream — use external unpacker." };
  }
  /** Prefer maps whose keys look like Serum module buckets (not dense numeric indices). */
  function moduleLikeness(obj) {
    const keys = Object.keys(obj);
    let score = 0;
    for (const k of keys) {
      if (/^ModMatrixEntry\d+$/.test(k)) score += 50;
      else if (/^(Osc|Env|LFO|Filter|Macro|Arp|FXRack|Global|Clip|Midi|Granular)/i.test(k)) score += 20;
      else if (/^[A-Za-z_][\w]*\d*$/.test(k) && !/^\d+$/.test(k)) score += 1;
    }
    return score;
  }
  objects.sort((a, b) => {
    const ds = moduleLikeness(b) - moduleLikeness(a);
    if (ds !== 0) return ds;
    return Object.keys(b).length - Object.keys(a).length;
  });
  const best = objects[0];
  if (moduleLikeness(best) === 0) {
    return {
      error:
        "Decoded objects look like raw arrays / numeric maps — not the encoder-style module tree. Unpack with community tools → JSON, then diff `data.*.plainParams`.",
    };
  }
  return { root: best, decodePath: "decodeMulti_largest_object_partial" };
}

async function loadDecoded(filePath) {
  const raw = readFileSync(filePath);
  const { compressed } = parsePreset(raw);
  const dec = await decompressCompressed(compressed);
  return decodeMsgpackModuleTree(dec);
}

async function main() {
  const dir = samplesDir();
  const files = listSerumPresets(dir);

  if (files.length === 0) {
    console.error(
      `serum2-mod-discovery: no .SerumPreset files in ${dir}\n` +
        `Create the folder and add presets, or set ALCHEMIST_SERUM2_SAMPLES_DIR.\n` +
        `Example: mkdir -p tools/serum2-samples && cp ~/Music/*.SerumPreset tools/serum2-samples/`,
    );
    process.exit(1);
  }

  const baselineName = process.env.ALCHEMIST_SERUM2_BASELINE?.trim() || files[0];
  if (!files.includes(baselineName)) {
    console.error(`serum2-mod-discovery: baseline ${baselineName} not in sample list`);
    process.exit(1);
  }

  /** @type {Array<{ file: string; meta: unknown; modEntries: Record<string, unknown>; topLevelKeys: string[]; decodePath?: string; decodeError?: string }>} */
  const loaded = [];
  for (const f of files) {
    const full = join(dir, f);
    try {
      const unpacked = await loadDecoded(full);
      const metaStr = (() => {
        try {
          const p = parsePreset(readFileSync(full));
          return JSON.parse(Buffer.from(p.jsonBytes).toString("utf8"));
        } catch {
          return null;
        }
      })();
      if ("error" in unpacked && unpacked.error) {
        loaded.push({
          file: f,
          meta: metaStr,
          modEntries: {},
          topLevelKeys: [],
          decodeError: unpacked.error,
        });
        console.error(`serum2-mod-discovery: ${f}: ${unpacked.error}`);
        continue;
      }
      const root = moduleRoot(unpacked.root);
      if (root == null) {
        loaded.push({
          file: f,
          meta: metaStr,
          modEntries: {},
          topLevelKeys: [],
          decodePath: unpacked.decodePath,
          decodeError:
            "Unwrapped payload is numeric-indexed only (not `Osc0` / `ModMatrixEntry*` buckets). Use community unpack → JSON for mod-matrix diffs.",
        });
        console.error(`serum2-mod-discovery: ${f}: numeric-only inner map after unwrap — see report`);
        continue;
      }
      const topLevelKeys =
        root && typeof root === "object" && !Array.isArray(root) ? Object.keys(root).sort() : [];
      loaded.push({
        file: f,
        meta: metaStr,
        modEntries: extractModMatrixEntries(root),
        topLevelKeys,
        decodePath: unpacked.decodePath,
      });
    } catch (e) {
      console.error(`serum2-mod-discovery: skip ${f}: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (loaded.length === 0) {
    console.error("serum2-mod-discovery: no presets could be parsed");
    process.exit(1);
  }

  const base = loaded.find((x) => x.file === baselineName) ?? loaded[0];
  /** @type {Set<string>} */
  const allParamKeys = new Set();
  /** @type {Array<Record<string, unknown>>} */
  const valueDiffs = [];

  for (const preset of loaded) {
    if (preset.file === base.file) continue;
    for (const slot of Object.keys(preset.modEntries)) {
      const b = plainParamsRecord(base.modEntries[slot]);
      const c = plainParamsRecord(preset.modEntries[slot]);
      if (!c) continue;
      for (const paramKey of Object.keys(c)) {
        allParamKeys.add(paramKey);
        const bv = b?.[paramKey];
        const cv = c[paramKey];
        if (stableStringify(bv) !== stableStringify(cv)) {
          valueDiffs.push({
            baselineFile: base.file,
            compareFile: preset.file,
            modSlot: slot,
            paramKey,
            baselineValue: bv ?? null,
            compareValue: cv,
          });
        }
      }
    }
  }

  /** Keys seen in any slot plainParams */
  for (const preset of loaded) {
    for (const slot of Object.keys(preset.modEntries)) {
      const pp = plainParamsRecord(preset.modEntries[slot]);
      if (pp) for (const k of Object.keys(pp)) allParamKeys.add(k);
    }
  }

  const outDir = join(repoRoot, "tools", "serum2-discovery");
  mkdirSync(outDir, { recursive: true });
  const modKeyHints = loaded.flatMap((p) =>
    p.topLevelKeys.filter((k) => /mod/i.test(k) || k.includes("Matrix")),
  );

  const report = {
    timestamp: new Date().toISOString(),
    note:
      "Diagnostic only — not Serum 1 HARD GATE. Review before adding to serum2-param-catalog / SERUM2_CBOR_MAP.",
    innerFormat:
      "Strict MessagePack (`decode`) for Alchemist-encoded presets; factory files may need community unpack → JSON for full module trees.",
    samplesDir: dir,
    baseline: base.file,
    filesAnalyzed: loaded.map((x) => x.file),
    topLevelKeysByFile: Object.fromEntries(loaded.map((p) => [p.file, p.topLevelKeys])),
    decodeInfoByFile: Object.fromEntries(
      loaded.map((p) => [
        p.file,
        {
          decodePath: p.decodePath ?? null,
          decodeError: p.decodeError ?? null,
        },
      ]),
    ),
    modMatrixKeyHints: [...new Set(modKeyHints)].sort(),
    modMatrixSlotsSeen: [
      ...new Set(loaded.flatMap((p) => Object.keys(p.modEntries))),
    ].sort(),
    allPlainParamKeysSorted: [...allParamKeys].sort(),
    valueDiffCount: valueDiffs.length,
    valueDiffs,
  };

  const outPath = join(outDir, "mod-discovery-report.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.error(`serum2-mod-discovery: wrote ${outPath}`);
  console.error(
    `  presets=${loaded.length} baseline=${base.file} modSlots=${report.modMatrixSlotsSeen.length} uniqueParamKeys=${allParamKeys.size} diffs=${valueDiffs.length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
