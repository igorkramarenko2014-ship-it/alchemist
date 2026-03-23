import { createHash } from "node:crypto";
import { encode } from "@msgpack/msgpack";
import { compress } from "@mongodb-js/zstd";

export type Serum2Params = {
  presetName: string;
  presetAuthor?: string;
  presetDescription?: string;
  filter: { freq: number; reso: number; drive: number };
  env0: { attack: number; decay: number; release: number; curve1: number };
  env1: { release: number; curve1: number };
  rawParams?: Record<string, number>;
};

const MAGIC = Buffer.from("XferJson", "ascii");
const SEP = Buffer.from([0x72, 0x5d, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00]);

function buildPreamble(jsonByteLength: number): Buffer {
  if (jsonByteLength > 0xffff) {
    throw new Error(`JSON metadata length ${jsonByteLength} exceeds u16 preamble field`);
  }
  const preamble = Buffer.alloc(9);
  preamble[0] = 0x00;
  preamble[1] = jsonByteLength & 0xff;
  preamble[2] = (jsonByteLength >> 8) & 0xff;
  preamble[3] = 0x01;
  preamble.fill(0, 4, 9);
  return preamble;
}

function buildMessagePackMap(params: Serum2Params): Record<string, unknown> {
  const filterDefault: Record<string, number> = {
    kParamFreq: params.filter.freq,
    kParamReso: params.filter.reso,
    kParamDrive: params.filter.drive,
    ...params.rawParams,
  };

  return {
    Env0: {
      plainParams: {
        default: {
          kParamAttack: params.env0.attack,
          kParamDecay: params.env0.decay,
          kParamRelease: params.env0.release,
          kParamCurve1: params.env0.curve1,
          kParamCurve2: 1.0,
          kParamCurve3: 1.0,
        },
      },
    },
    Env1: {
      plainParams: {
        default: {
          kParamRelease: params.env1.release,
          kParamCurve1: params.env1.curve1,
        },
      },
    },
    Filter: {
      plainParams: {
        default: filterDefault,
      },
    },
  };
}

/**
 * Encode a minimal Serum 2 `.SerumPreset` (XferJson + preamble + JSON + separator + zstd MessagePack).
 * Returns a Promise because zstd compression uses async native bindings.
 */
export async function encodeSerum2Preset(params: Serum2Params): Promise<Buffer> {
  const jsonMeta = {
    fileType: "SerumPreset",
    hash: createHash("md5")
      .update(`${params.presetName}${Date.now()}`, "utf8")
      .digest("hex"),
    presetName: params.presetName,
    presetAuthor: params.presetAuthor ?? "Alchemist AI",
    presetDescription: params.presetDescription ?? "",
    product: "Serum2",
    productVersion: "2.0.24",
    tags: ["Wavetable"],
    vendor: "Xfer Records",
    version: 4.0,
  };

  const jsonBytes = Buffer.from(JSON.stringify(jsonMeta), "utf8");
  const preamble = buildPreamble(jsonBytes.length);

  const msgMap = buildMessagePackMap(params);
  const msgpackBytes = encode(msgMap, { forceFloat32: true });

  const compressed = await compress(Buffer.from(msgpackBytes), 3);

  return Buffer.concat([MAGIC, preamble, jsonBytes, SEP, compressed]);
}
