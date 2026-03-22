#!/usr/bin/env node
/**
 * Live check: Groq + DeepSeek + Qwen (DashScope) from apps/web-app/.env.local — never prints key values.
 * Usage: pnpm verify:keys
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, "apps", "web-app", ".env.local");

function parseEnvLocal(s) {
  const env = {};
  for (const line of s.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

async function main() {
  if (!fs.existsSync(envPath)) {
    console.error("Missing:", envPath);
    process.exit(1);
  }
  const env = parseEnvLocal(fs.readFileSync(envPath, "utf8"));
  const groq = env.GROQ_API_KEY || env.LLAMA_API_KEY || "";
  const deepseek = env.DEEPSEEK_API_KEY || "";
  const qwen = env.QWEN_API_KEY || "";
  const qwenBase =
    (env.QWEN_BASE_URL || "").trim() ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const qwenCompletionsUrl = `${qwenBase.replace(/\/$/, "")}/chat/completions`;
  const qwenModel = qwenBase.toLowerCase().includes("openrouter")
    ? "qwen/qwen-plus"
    : "qwen-plus";

  const lines = [];

  if (!groq) {
    lines.push("GROQ: SKIP (GROQ_API_KEY and LLAMA_API_KEY empty)");
  } else {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groq}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        max_tokens: 8,
      }),
    });
    let msg = r.statusText;
    try {
      const j = await r.json();
      if (typeof j?.error?.message === "string") msg = j.error.message;
    } catch {
      /* ignore */
    }
    lines.push(
      r.ok ? `GROQ: OK (HTTP ${r.status})` : `GROQ: FAIL (HTTP ${r.status}) — ${msg}`
    );
  }

  if (!deepseek) {
    lines.push("DEEPSEEK: SKIP (DEEPSEEK_API_KEY empty)");
  } else {
    const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseek}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        max_tokens: 8,
      }),
    });
    let msg = r.statusText;
    try {
      const j = await r.json();
      if (typeof j?.error?.message === "string") msg = j.error.message;
    } catch {
      /* ignore */
    }
    const hint =
      r.status === 402 ? " — add credits / billing in DeepSeek console" : "";
    lines.push(
      r.ok
        ? `DEEPSEEK: OK (HTTP ${r.status})`
        : `DEEPSEEK: FAIL (HTTP ${r.status}) — ${msg}${hint}`
    );
  }

  if (!qwen) {
    lines.push("QWEN: SKIP (QWEN_API_KEY empty)");
  } else {
    const r = await fetch(qwenCompletionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${qwen}`,
      },
      body: JSON.stringify({
        model: qwenModel,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        max_tokens: 8,
      }),
    });
    let msg = r.statusText;
    try {
      const j = await r.json();
      if (typeof j?.error?.message === "string") msg = j.error.message;
    } catch {
      /* ignore */
    }
    lines.push(
      r.ok ? `QWEN: OK (HTTP ${r.status})` : `QWEN: FAIL (HTTP ${r.status}) — ${msg}`
    );
  }

  console.log(lines.join("\n"));
  const failed = lines.some((l) => l.includes(": FAIL"));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
