#!/usr/bin/env bash
# Run a uv command in every Python project.
# Usage: pnpm py lint | typecheck | test | build | sync
set -euo pipefail

PROJECTS=(services/agent services/stt services/translate services/tts services/ai tests/bench)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "${1:-}" in
  sync)      CMD=(uv sync --locked) ;;
  lint)      CMD=(uv run --locked ruff check . "&&" uv run --locked ruff format --check .) ;;
  typecheck) CMD=(uv run --locked mypy) ;;
  test)      CMD=(uv run --locked pytest) ;;
  build)     CMD=(uv build --quiet) ;;
  *) echo "usage: $0 {sync|lint|typecheck|test|build}" >&2; exit 2 ;;
esac

for project in "${PROJECTS[@]}"; do
  echo "==> ${project}: ${1}"
  (cd "${ROOT}/${project}" && eval "${CMD[*]}")
done
