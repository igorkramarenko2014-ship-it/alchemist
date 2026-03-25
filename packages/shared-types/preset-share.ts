/**
 * User-consented shareable preset snapshot — **no** `.fxp` bytes, no offset map.
 * `paramArray` is display-only on `/presets/[slug]`.
 */
export interface SharedPreset {
  slug: string;
  prompt: string;
  description: string;
  reasoning: string;
  paramArray: number[];
  score: number;
  /** Alchemist codename (ATHENA / HERMES / HESTIA). */
  panelist: string;
  sharedAt: string;
  wasmAvailable: boolean;
}
