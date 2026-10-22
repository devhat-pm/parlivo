#!/usr/bin/env bash
# Runs on the pod: the GPU-box variant of the dev stack as plain processes (no Docker inside
# a RunPod pod, ADR 0009): LiveKit, STT in gpu mode, and the supervised translation agent.
#   bash infra/gpu-dev/stack.sh start | stop | status
set -uo pipefail
cd /workspace/parlivo
export PATH="$HOME/.local/bin:$PATH"
LOGS=/workspace/logs
mkdir -p "$LOGS"
# CTranslate2 loads cuBLAS and cuDNN from the pip-installed NVIDIA wheels.
NV=$(ls -d services/stt/.venv/lib/python3.12/site-packages/nvidia/*/lib | tr '\n' ':')
export LD_LIBRARY_PATH="${NV}${LD_LIBRARY_PATH:-}"

wait_for() { for _ in $(seq 1 180); do curl -sf -o /dev/null "$1" && return 0; sleep 2; done; echo "timeout: $1"; return 1; }

case "${1:-start}" in
  start)
    setsid nohup livekit-server --config infra/dev/livekit.yaml >"$LOGS/livekit.log" 2>&1 &
    wait_for http://127.0.0.1:7880/
    (cd services/stt && STT_MODE=gpu setsid nohup uv run --locked parlivo-stt >"$LOGS/stt.log" 2>&1 &)
    wait_for http://127.0.0.1:8300/healthz
    PARLIVO_TIMINGS_PATH=/workspace/timings.jsonl setsid nohup bash scripts/run-agent.sh >"$LOGS/agent.log" 2>&1 &
    wait_for http://127.0.0.1:9464/metrics
    echo "stack up: livekit :7880, stt :8300 (gpu), agent metrics :9464"
    ;;
  stop)
    pkill -f run-agent.sh; pkill -f "parlivo-agent start"; pkill -f parlivo-stt; pkill -f livekit-server
    (cd services/stt && uv run ray stop --force >/dev/null 2>&1) || true
    ;;
  status)
    for url in http://127.0.0.1:7880/ http://127.0.0.1:8300/healthz http://127.0.0.1:9464/metrics; do
      printf "%s %s\n" "$(curl -s -o /dev/null -w '%{http_code}' "$url")" "$url"
    done
    ;;
esac
