#!/usr/bin/env bash
# Runs on the RunPod pod (Ubuntu 24.04, CUDA 12.9 base). Installs the phase 1 GPU stack:
# uv, the repo at $REF, STT (gpu extra), agent, bench, and the LiveKit server binary.
set -euo pipefail
REF="${REF:-main}"
REPO="${REPO:-https://github.com/devhat-pm/parlivo.git}"
export DEBIAN_FRONTEND=noninteractive

apt-get update -qq && apt-get install -y -qq git curl ca-certificates >/dev/null
if ! command -v uv >/dev/null; then
  curl -LsSf https://astral.sh/uv/0.13.5/install.sh | env UV_NO_MODIFY_PATH=1 sh >/dev/null
fi
export PATH="$HOME/.local/bin:$PATH"

if [ ! -d /workspace/parlivo ]; then git clone -q "$REPO" /workspace/parlivo; fi
cd /workspace/parlivo
git fetch -q origin && git checkout -q "$REF"

(cd services/stt && uv sync --locked --extra gpu -q)
(cd services/agent && uv sync --locked -q)
(cd tests/bench && uv sync --locked -q)

if ! command -v livekit-server >/dev/null; then
  curl -sL https://github.com/livekit/livekit/releases/download/v1.13.10/livekit_1.13.10_linux_amd64.tar.gz \
    | tar -xz -C /usr/local/bin livekit-server
fi
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
echo "bootstrap done at $(git rev-parse --short HEAD)"
