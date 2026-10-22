# infra/gpu-dev: on-demand L4 benchmark box (RunPod)

The pipeline runs on the Mac every day. This box exists **only** to produce L4 benchmark numbers (ADR 0009). It costs about **$0.59 per hour** (RunPod Secure Cloud, 1× NVIDIA L4 24 GB, price checked 2026-10-22) and is billed only while it exists.

**Stop-when-idle rule:** create it for a benchmark, copy the results off, then `pnpm gpu:down` straight away. Never leave it running unattended.

```bash
pnpm gpu:login        # once: RunPod API key -> macOS Keychain (hidden prompt; never committed)
pnpm gpu:up           # create the pod, wait for SSH (prints $/h)
pnpm gpu:bootstrap    # clone this repo at HEAD, install STT[gpu], agent, bench, LiveKit binary
pnpm gpu:ssh -- 'bash /workspace/parlivo/infra/gpu-dev/stack.sh start'   # LiveKit + STT(gpu) + agent
pnpm gpu:ssh          # interactive shell (add -- -L 8300:localhost:8300 to tunnel GPU STT to the Mac)
pnpm gpu:status       # state, GPU, $/h, cost since start
pnpm gpu:down         # terminate: nothing left, nothing billed
```

There is no Docker inside a RunPod pod, so `stack.sh` runs the GPU variant of the dev stack as processes (logs in `/workspace/logs`). The benchmark runs on the pod itself; see `tests/bench` and `docs/benchmarks/`.
