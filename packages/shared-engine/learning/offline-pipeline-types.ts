/**
 * **Types only** — for a future **separate** offline service (vector DB, ETL, Python).
 * `shared-engine` does **not** implement indexing or HTTP fetches here (bundle + FIRE).
 */

/** One row your **external** embedder / indexer might store (illustrative). */
export interface GreatLibraryVectorDocument {
  /** Stable id in your vector store. */
  id: string;
  /** Text or tags used to build the embedding (e.g. preset name + user tags). */
  descriptorText: string;
  /**
   * Optional: path or URI to **metadata** — not raw proprietary Serum IP.
   * Binary `.fxp` parsing belongs in **`tools/`** + **HARD GATE** (`serum-offset-map.ts`).
   */
  sourceUri?: string;
  /** License / redistribution class — **required** before production indexing. */
  licenseClass?: "CC" | "PUBLIC_DOMAIN" | "OWNER_AUTHORIZED" | "UNKNOWN";
  /** ISO-8601 when indexed. */
  indexedAt?: string;
}

/** Boundary: offline job output shape you might JSON-serialize into `GreatLibraryContext.notes` or a DB. */
export interface GreatLibraryOfflineJobMeta {
  jobRunId: string;
  documentCount: number;
  provenance: string;
  collectedAt: string;
}
