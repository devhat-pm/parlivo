#!/usr/bin/env bash
# Run the translation agent worker and restart it whenever it exits, like a Kubernetes
# Deployment would. Used for local development and the e2e crash-recovery test.
#   STT_URL=http://127.0.0.1:8300 scripts/run-agent.sh
# The worker's PID is written to $PARLIVO_AGENT_PIDFILE (default .run/agent.pid) so tests can
# kill exactly the worker process (its process title is rewritten, so pkill -f is unreliable).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="${PARLIVO_AGENT_PIDFILE:-$ROOT/.run/agent.pid}"
mkdir -p "$(dirname "$PIDFILE")"
cd "$ROOT/services/agent"
uv sync --locked -q
trap 'kill "$(cat "$PIDFILE" 2>/dev/null)" 2>/dev/null; exit 0' INT TERM
while true; do
  .venv/bin/parlivo-agent start &
  echo $! > "$PIDFILE"
  wait $!
  echo "parlivo-agent exited with $?; restarting in 1 s" >&2
  sleep 1
done
