/**
 * Shared preset store (single interface; swap backend without changing callers).
 *
 * Canon reality: an in-memory Map breaks shared URL reliability on multi-instance deploys.
 * For this repo’s default (no Vercel KV dependency), we persist to a local `.data/` directory.
 *
 * Move 2 follow-up: if you add a KV/DB backend later, implement the adapter interface below
 * and keep `saveSharedPreset/getSharedPreset/getSharedPresetCount` signatures unchanged.
 */
import type { SharedPreset } from "@alchemist/shared-types";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface PresetStoreAdapter {
  save(preset: SharedPreset): void;
  get(slug: string): SharedPreset | null;
  count(): number;
}

const here = dirname(fileURLToPath(import.meta.url)); // .../apps/web-app/lib
const repoRoot = dirname(dirname(dirname(here))); // .../Vibe Projects
const dataDir = join(repoRoot, ".data", "preset-store");

const memory = new Map<string, SharedPreset>();
const memoryAdapter: PresetStoreAdapter = {
  save: (p) => {
    memory.set(p.slug, p);
  },
  get: (slug) => memory.get(slug) ?? null,
  count: () => memory.size,
};

function presetPath(slug: string): string {
  return join(dataDir, `${slug}.json`);
}

function ensureDataDir(): void {
  if (existsSync(dataDir)) return;
  mkdirSync(dataDir, { recursive: true });
}

const fileAdapter: PresetStoreAdapter = {
  save: (p) => {
    try {
      ensureDataDir();
      const finalPath = presetPath(p.slug);
      const tmpPath = `${finalPath}.tmp`;
      writeFileSync(tmpPath, JSON.stringify(p), "utf8");
      renameSync(tmpPath, finalPath);
    } catch {
      // Defensive fallback: persistence is best-effort; never break the share UX.
      memoryAdapter.save(p);
    }
  },
  get: (slug) => {
    try {
      const p = presetPath(slug);
      if (!existsSync(p)) return null;
      return JSON.parse(readFileSync(p, "utf8")) as SharedPreset;
    } catch {
      return null;
    }
  },
  count: () => {
    try {
      if (!existsSync(dataDir)) return memory.size;
      const files = readdirSync(dataDir);
      const jsonCount = files.filter((f) => f.endsWith(".json")).length;
      return jsonCount + memory.size;
    } catch {
      return memory.size;
    }
  },
};

const presetStore: PresetStoreAdapter = fileAdapter;

export function saveSharedPreset(preset: SharedPreset): void {
  presetStore.save(preset);
}

export function getSharedPreset(slug: string): SharedPreset | null {
  return presetStore.get(slug);
}

export function getSharedPresetCount(): number {
  return presetStore.count();
}
