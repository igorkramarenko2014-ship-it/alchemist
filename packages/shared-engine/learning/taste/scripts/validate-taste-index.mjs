#!/usr/bin/env node
/**
 * Validates `taste-index.json` (or `taste-index.example.json`) vs `taste-schema.json`.
 * Not part of verify:harsh — run manually or in deploy: `pnpm taste:validate`
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TASTE_DIR = join(__dirname, "..");
const SCHEMA_PATH = join(TASTE_DIR, "taste-schema.json");

function resolveIndexPath() {
  const env = (process.env.ALCHEMIST_TASTE_INDEX_PATH ?? "").trim();
  if (env && existsSync(env)) return env;
  const primary = join(TASTE_DIR, "taste-index.json");
  if (existsSync(primary)) return primary;
  return join(TASTE_DIR, "taste-index.example.json");
}

function main() {
  const errors = [];
  const indexPath = resolveIndexPath();
  if (!existsSync(indexPath)) {
    console.log(JSON.stringify({ status: "fail", errors: [{ message: `missing index: ${indexPath}` }] }));
    process.exit(1);
  }
  if (!existsSync(SCHEMA_PATH)) {
    console.log(JSON.stringify({ status: "fail", errors: [{ message: `missing schema: ${SCHEMA_PATH}` }] }));
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(readFileSync(indexPath, "utf8"));
  } catch (e) {
    console.log(
      JSON.stringify({
        status: "fail",
        errors: [{ message: `parse ${indexPath}`, detail: String(e) }],
      }),
    );
    process.exit(1);
  }

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    for (const err of validate.errors ?? []) {
      errors.push({
        path: err.instancePath || "(root)",
        message: err.message ?? "validation error",
        keyword: err.keyword,
      });
    }
    console.error("taste-index AJV errors:", validate.errors);
    console.log(JSON.stringify({ status: "fail", errors, indexPath }));
    process.exit(1);
  }

  const dom = data.ownMusicAnchor?.dominantCluster;
  const clusters = data.tasteClusters ?? [];
  const ids = new Set(clusters.map((c) => c.id));
  if (typeof dom === "number") {
    const hit = clusters.find((c) => c.index === dom);
    if (!hit) {
      errors.push({ message: `ownMusicAnchor.dominantCluster index ${dom} has no matching tasteCluster` });
    }
  }

  const maxOwn = Math.max(0, ...clusters.map((c) => c.ownMusicAffinity ?? 0));
  if (maxOwn < 0.7) {
    errors.push({ message: `expected at least one cluster with ownMusicAffinity >= 0.7, got max ${maxOwn}` });
  }

  if (errors.length > 0) {
    console.log(JSON.stringify({ status: "fail", errors, indexPath }));
    process.exit(1);
  }

  console.log(JSON.stringify({ status: "ok", clusterCount: clusters.length, indexPath }));
  process.exit(0);
}

main();
