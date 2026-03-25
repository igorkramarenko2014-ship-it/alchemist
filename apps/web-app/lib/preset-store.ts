/**
 * In-memory store for shared presets. Swap this module for KV / DB without changing callers.
 */
import type { SharedPreset } from "@alchemist/shared-types";

const store = new Map<string, SharedPreset>();

export function saveSharedPreset(preset: SharedPreset): void {
  store.set(preset.slug, preset);
}

export function getSharedPreset(slug: string): SharedPreset | null {
  return store.get(slug) ?? null;
}

export function getSharedPresetCount(): number {
  return store.size;
}
