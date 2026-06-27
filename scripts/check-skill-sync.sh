#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRODUCT_SKILL="/Users/bytedance/code/kennyshaw/video2txt/packages/web/public/SKILL.md"

diff -u "$ROOT_DIR/skills/videosays/SKILL.md" "$ROOT_DIR/SKILL.md"

if [[ -f "$PRODUCT_SKILL" ]]; then
  diff -u "$ROOT_DIR/skills/videosays/SKILL.md" "$PRODUCT_SKILL"
fi
