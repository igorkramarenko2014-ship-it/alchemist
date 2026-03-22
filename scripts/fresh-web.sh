#!/usr/bin/env bash
# Clear Next/Turbo caches and start web-app dev with latest workspace sources.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
pnpm run clean
echo "Starting @alchemist/web-app dev (fresh)…"
pnpm --filter @alchemist/web-app run dev:fresh
