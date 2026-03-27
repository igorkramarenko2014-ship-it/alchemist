#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8"));
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        // ignore
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(baseUrl, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const r = await fetch(`${baseUrl}/api/health`, { method: "GET" });
      if (r.ok) return true;
    } catch {
      // keep polling
    }
    await sleep(500);
  }
  return false;
}

function openBrowser(url) {
  const disabled = process.env.DEMO_LAUNCH_NO_OPEN === "1";
  if (disabled) return;
  if (process.platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    return;
  }
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    return;
  }
  spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("demo-launch: monorepo root not found\n");
  process.exit(1);
}

const demoPrompt = process.env.DEMO_PROMPT ?? "";
const healthTimeoutMs = Number.isFinite(Number(process.env.DEMO_HEALTH_TIMEOUT_MS))
  ? Number(process.env.DEMO_HEALTH_TIMEOUT_MS)
  : 45_000;

let detectedUrl = "";
const child = spawn("pnpm", ["dev"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env },
});

const onLine = (line) => {
  process.stdout.write(`${line}\n`);
  if (!detectedUrl) {
    const m = line.match(/http:\/\/127\.0\.0\.1:\d+/);
    if (m) detectedUrl = m[0];
  }
};

let stdoutBuf = "";
child.stdout.on("data", (chunk) => {
  stdoutBuf += chunk.toString();
  const lines = stdoutBuf.split("\n");
  stdoutBuf = lines.pop() ?? "";
  lines.forEach(onLine);
});

let stderrBuf = "";
child.stderr.on("data", (chunk) => {
  stderrBuf += chunk.toString();
  const lines = stderrBuf.split("\n");
  stderrBuf = lines.pop() ?? "";
  lines.forEach((line) => process.stderr.write(`${line}\n`));
});

const terminate = () => {
  if (!child.killed) child.kill("SIGTERM");
};
process.on("SIGINT", terminate);
process.on("SIGTERM", terminate);

(async () => {
  const started = Date.now();
  while (!detectedUrl && Date.now() - started < 30_000) {
    await sleep(200);
  }
  const baseUrl = detectedUrl || "http://127.0.0.1:3000";
  const ok = await waitForHealth(baseUrl, healthTimeoutMs);
  if (!ok) {
    process.stderr.write(
      `demo-launch: health readiness timeout at ${baseUrl} (increase DEMO_HEALTH_TIMEOUT_MS if needed)\n`,
    );
    return;
  }

  const launchUrl =
    demoPrompt.trim().length > 0
      ? `${baseUrl}/?demoPrompt=${encodeURIComponent(demoPrompt.trim())}`
      : baseUrl;
  openBrowser(launchUrl);
  process.stderr.write(
    `demo-launch: ready at ${baseUrl} | browser ${process.env.DEMO_LAUNCH_NO_OPEN === "1" ? "not opened (DEMO_LAUNCH_NO_OPEN=1)" : "opened"}\n`,
  );
  process.stderr.write(
    "demo-launch: no hidden state injected; use normal UI flow (prompt bar / triad actions) for demos\n",
  );
})();

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
