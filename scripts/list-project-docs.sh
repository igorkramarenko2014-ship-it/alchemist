#!/usr/bin/env bash
# List first-party markdown (excludes node_modules, .cargo, .next, etc.)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "# Project documentation files (generated listing)"
echo "# Run: scripts/list-project-docs.sh"
echo ""

find . -maxdepth 1 -type f \( -name '*.md' -o -name '*.mdc' \) 2>/dev/null | sed 's|^\./||' | sort

find \
  docs apps packages tools config vst .cursor scripts \
  -type f \( -name '*.md' -o -name '*.mdc' \) \
  ! -path '*/node_modules/*' \
  ! -path '*/.next/*' \
  ! -path '*/dist/*' \
  2>/dev/null | sort | while read -r f; do
  echo "$f"
done
