/**
 * Deterministic prompt fingerprint for telemetry (not a security hash).
 * FNV-1a 32-bit — safe in browser bundles (no Node `crypto`).
 */
export function fingerprintPromptNormalized(normalizedLowercaseTrimmed: string): string {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < normalizedLowercaseTrimmed.length; i++) {
    h ^= normalizedLowercaseTrimmed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
