declare module "@alchemist/fxp-encoder/wasm" {
  export default function init(): Promise<void>;
  export function encode_fxp_fxck(params: Float32Array, programName: string): Uint8Array;
  export function decode_fxp_fxck(data: Uint8Array): { programName: string; params: Float32Array };
}
