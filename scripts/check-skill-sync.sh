#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

diff -u "$ROOT_DIR/skills/videosays/SKILL.md" "$ROOT_DIR/SKILL.md"

if [[ -n "${VIDEOSAYS_PUBLIC_SKILL_PATH:-}" ]]; then
  diff -u "$ROOT_DIR/skills/videosays/SKILL.md" "$VIDEOSAYS_PUBLIC_SKILL_PATH"
fi
