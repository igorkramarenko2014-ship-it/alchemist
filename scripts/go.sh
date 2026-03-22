#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

# Load shell config so nvm/fnm/volta (and thus node) are in PATH
[[ -f "$HOME/.zprofile" ]] && source "$HOME/.zprofile" 2>/dev/null || true
[[ -f "$HOME/.zshrc" ]] && source "$HOME/.zshrc" 2>/dev/null || true

# Try project-local Node first, then common locations
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -x "$SCRIPT_DIR/.node/bin/node" ]]; then
  export PATH="$SCRIPT_DIR/.node/bin:$PATH"
elif ! command -v node &>/dev/null; then
  for dir in /opt/homebrew/bin /usr/local/bin "$HOME/.nvm/versions/node/"*/bin "$HOME/.fnm/node-versions/"*/installation/bin "$HOME/.volta/bin"; do
    [[ -x "$dir/node" ]] && export PATH="$dir:$PATH" && break
  done
fi

if ! command -v node &>/dev/null; then
  echo ""
  echo "  Node.js is not installed or not in PATH."
  echo ""
  echo "  Install it first:"
  echo "    • https://nodejs.org  (download and run the installer)"
  echo "    • or: brew install node   (if you use Homebrew)"
  echo ""
  echo "  Then close and reopen Terminal, and run this script again."
  echo ""
  exit 1
fi

# Ensure pnpm is available
PNPM="pnpm"
if ! command -v pnpm &>/dev/null; then
  if command -v corepack &>/dev/null; then
    corepack enable
  fi
  if ! command -v pnpm &>/dev/null; then
    PNPM="npx pnpm"
  fi
fi
$PNPM install

# Fresh Next cache + dev (fixes stale workspace packages). Use: ALCHEMIST_FRESH=1 ./scripts/go.sh
if [[ "${ALCHEMIST_FRESH:-}" == "1" ]] || [[ "${1:-}" == "fresh" ]]; then
  echo ""
  echo "  ALCHEMIST_FRESH: clearing .next / .turbo and starting web dev…"
  echo ""
  $PNPM run web:dev:fresh
else
  $PNPM dev
fi

