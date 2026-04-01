import { env } from "@/env";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const CALIBRATION_FILE = path.join(process.cwd(), "packages/shared-engine/calibration/human-trinity.json");

export async function GET(request: Request) {
  const auth = checkAuth(request);
  if (auth) return auth;

  try {
    if (!fs.existsSync(CALIBRATION_FILE)) {
      // Default Human Trinity
      const defaultData = {
        vectors: {
          svitlana: { name: "Svitlana", archetype: "Athena", harmony: 0.95, focus: "Truth" },
          anton: { name: "Anton", archetype: "Hermes", rhythm: 0.92, focus: "Movement" },
          elisey: { name: "Elisey", archetype: "Hestia", texture: 0.88, focus: "Timbre" }
        },
        lastSync: new Date().toISOString()
      };
      return NextResponse.json(defaultData);
    }
    const data = JSON.parse(fs.readFileSync(CALIBRATION_FILE, "utf-8"));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ ok: false, error: "data_load_failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = checkAuth(request);
  if (auth) return auth;

  try {
    const data = await request.json();
    const dir = path.dirname(CALIBRATION_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(CALIBRATION_FILE, JSON.stringify(data, null, 2));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "data_save_failed" }, { status: 500 });
  }
}

function checkAuth(request: Request) {
  if (!env.alchemistOpsToken) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 503 });
  }
  const token = request.headers.get("x-ops-token");
  if (token !== env.alchemistOpsToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}
