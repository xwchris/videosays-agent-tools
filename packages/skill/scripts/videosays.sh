#!/usr/bin/env bash
set -euo pipefail

# Call the Videosays CLI through npx so agent runtimes do not need a global install.
exec npx videosays-cli "$@"
