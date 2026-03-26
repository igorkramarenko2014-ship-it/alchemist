export interface TruthMatrixRow {
  path: string;
  stubMode: string;
  fetcherMode: string;
  tablebaseHit: string;
  wasmExport: string;
  hardGate: string;
  verifySignal: string;
}

export interface TruthMatrixSnapshot {
  generatedAtMs: number;
  triadLivePanelists: string[];
  triadFullyLive: boolean;
  wasmStatus: "available" | "unavailable";
  hardGate: "enforced" | "best_effort";
  rows: TruthMatrixRow[];
}

export function buildTruthMatrixSnapshot(input: {
  triadLivePanelists: string[];
  triadFullyLive: boolean;
  wasmAvailable: boolean;
  strictOffsetsEnabled: boolean;
}): TruthMatrixSnapshot {
  const wasmStatus = input.wasmAvailable ? "available" : "unavailable";
  const hardGate = input.strictOffsetsEnabled ? "enforced" : "best_effort";
  return {
    generatedAtMs: Date.now(),
    triadLivePanelists: input.triadLivePanelists,
    triadFullyLive: input.triadFullyLive,
    wasmStatus,
    hardGate,
    rows: [
      {
        path: "Triad candidates",
        stubMode: "Yes",
        fetcherMode: "Yes",
        tablebaseHit: "Short-circuit",
        wasmExport: "N/A",
        hardGate: "N/A",
        verifySignal: "triadMode, triadLivePanelists",
      },
      {
        path: "TS gates (Undercover/Slavic)",
        stubMode: "Yes",
        fetcherMode: "Yes",
        tablebaseHit: "Yes",
        wasmExport: "N/A",
        hardGate: "N/A",
        verifySignal: "gateDropRate",
      },
      {
        path: "Preset share",
        stubMode: "Yes",
        fetcherMode: "Yes",
        tablebaseHit: "Yes",
        wasmExport: "No bytes",
        hardGate: "N/A",
        verifySignal: "preset_shared telemetry",
      },
      {
        path: "Browser .fxp export",
        stubMode: "Disabled when unavailable",
        fetcherMode: "Disabled when unavailable",
        tablebaseHit: "Disabled",
        wasmExport: "Requires assert:wasm pass",
        hardGate: "Enforced for authoritative bytes",
        verifySignal: "wasmStatus, wasmRequired",
      },
      {
        path: "VST observe/wrapper",
        stubMode: "N/A",
        fetcherMode: "N/A",
        tablebaseHit: "N/A",
        wasmExport: "N/A",
        hardGate: "Enforced",
        verifySignal: "vstObserverStatus, vstWrapperStatus",
      },
    ],
  };
}

