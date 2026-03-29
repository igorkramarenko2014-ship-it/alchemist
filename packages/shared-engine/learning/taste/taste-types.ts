/**
 * Taste index types — aligned with `taste-schema.json` (Phase 4 advisory prior).
 */

export interface TasteCentroidCluster {
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
  acousticness: number;
  instrumentalness?: number;
}

export interface TasteAnchor {
  description: string;
  centroid: Record<string, number>;
  dominantCluster: number;
}

export interface TasteSerumBias {
  filterCutoff: string;
  reverbDepth: string;
  distortion: string;
  padBrightness: string;
  arpSpeed: string;
}

export interface TasteCluster {
  id: string;
  index: number;
  trackCount: number;
  weight: number;
  description: string;
  keyArtists: string[];
  centroid: TasteCentroidCluster;
  ownMusicAffinity: number;
  lighthouseAffinity: number;
  serum_bias: TasteSerumBias;
}

export interface TasteGlobalBias {
  preferHighEnergy: boolean;
  avoidHighAcousticness: boolean;
  avoidHighInstrumentalness: boolean;
  darkValenceBias: boolean;
  tempoRange: [number, number];
  governedBy: string;
}

export interface TasteIndex {
  schemaVersion: "1.0";
  generatedFrom: string[];
  governanceHierarchy: string[];
  ownMusicAnchor: TasteAnchor;
  lighthouseAnchor: TasteAnchor;
  tasteClusters: TasteCluster[];
  globalBias: TasteGlobalBias;
}
