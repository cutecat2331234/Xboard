#!/usr/bin/env bash
# Visual Gate parity status (see docs/PARITY-100.md)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/scripts/visual-gate/parity-status.mjs" "$@"
