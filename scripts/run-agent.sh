#!/usr/bin/env bash
# Run the translation agent worker and restart it whenever it exits, like a Kubernetes
# Deployment would. Used for local development and the e2e crash-recovery test.
#   STT_URL=http://127.0.0.1:8300 scripts/run-agent.sh
set -uo pipefail
cd "$(dirname "$0")/../services/agent"
while true; do
  uv run --locked parlivo-agent start
  echo "parlivo-agent exited with $?; restarting in 1 s" >&2
  sleep 1
done
